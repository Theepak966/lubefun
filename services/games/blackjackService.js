/**
 * Blackjack game service (single-player).
 *
 * Design goals (mirrors existing original games):
 * - Deterministic/provably-fair deck generation using the user's seed tuple.
 * - Minimal state persisted to DB so in-progress hands can be restored after restart.
 * - Socket API that matches the existing `type/command` pattern in `app.js`.
 */

var { pool } = require('@/lib/database.js');
var { emitSocketToUser, emitSocketToRoom } = require('@/lib/socket.js');
var { loggerDebug, loggerTrace, loggerInfo } = require('@/lib/logger.js');

var chatService = require('@/services/chatService.js');
var userService = require('@/services/userService.js');
var fairService = require('@/services/fairService.js');

var { time } = require('@/utils/formatDate.js');
var { getFormatAmount, getFormatAmountString, verifyFormatAmount, roundedToFixed } = require('@/utils/formatAmount.js');

var config = require('@/config/config.js');

var blackjackLogic = require('@/services/games/blackjackLogic.js');

var games = {};

function loadGames(){
	loggerDebug('[BLACKJACK] Loading Games');

	pool.query('SELECT * FROM `blackjack_bets` WHERE `ended` = 0', function(err1, row1) {
		if(err1) {
			loggerInfo('[BLACKJACK] Error In Loading Games');
			return setTimeout(function(){ loadGames(); }, 1000);
		}

		if(row1.length <= 0) return;

		row1.forEach(function(bet){
			if(games[bet.userid] !== undefined) return;

			try {
				games[bet.userid] = {
					id: bet.id,
					amount: getFormatAmount(bet.amount),
					player: blackjackLogic.decodeCards(bet.player),
					dealer: blackjackLogic.decodeCards(bet.dealer),
					deck: blackjackLogic.decodeCards(bet.deck),
					position: parseInt(bet.position)
				};
			} catch (e) {
				// If a corrupted row exists, we mark it ended to avoid endless load loops.
				pool.query('UPDATE `blackjack_bets` SET `ended` = 1, `result` = ' + pool.escape('error') + ' WHERE `id` = ' + pool.escape(bet.id));
			}
		});
	});
}

function getHouseEdgePercent(){
	var edge = config.settings.games.games.original.blackjack.house_edge.value;
	return Number(edge) || 0;
}

function applyHouseEdgeToProfit(profit){
	var edge = getHouseEdgePercent();
	var adjusted = profit * (100 - edge) / 100;
	return getFormatAmount(adjusted);
}

function getPublicState(userId, revealDealer){
	var game = games[userId];
	if(!game) {
		return {
			active: false,
			player: { cards: [], total: 0 },
			dealer: { cards: [], total: 0 },
			actions: { bet: true, hit: false, stand: false }
		};
	}

	var playerValue = blackjackLogic.calculateHandValue(game.player);

	var dealerCards = revealDealer ? game.dealer.slice() : [ game.dealer[0], null ];
	var dealerValue = revealDealer ? blackjackLogic.calculateHandValue(game.dealer) : blackjackLogic.calculateHandValue([ game.dealer[0] ]);

	return {
		active: true,
		amount: game.amount,
		player: {
			cards: game.player.slice(),
			total: playerValue.total
		},
		dealer: {
			cards: dealerCards,
			total: dealerValue.total,
			revealed: revealDealer === true
		},
		actions: {
			bet: false,
			hit: !playerValue.isBust && !playerValue.isBlackjack && playerValue.total < 21,
			stand: true
		}
	};
}

function dealNext(game){
	if(game.position >= game.deck.length) throw new Error('Deck exhausted');
	var card = game.deck[game.position];
	game.position += 1;
	return card;
}

function settleAndFinish(user, socket, game, result, winning, cooldown){
	var userId = user.userid;

	pool.query(
		'UPDATE `blackjack_bets` SET `player` = ' + pool.escape(blackjackLogic.encodeCards(game.player)) +
		', `dealer` = ' + pool.escape(blackjackLogic.encodeCards(game.dealer)) +
		', `position` = ' + pool.escape(game.position) +
		', `winning` = ' + pool.escape(winning) +
		', `ended` = 1, `result` = ' + pool.escape(result) +
		' WHERE `id` = ' + pool.escape(game.id),
		function(err1){
			if(err1) {
				emitSocketToUser(socket, 'message', 'error', { message: 'An error occurred while finishing bet (1)' });
				return cooldown(false, true);
			}

			userService.finishOriginalBet(
				userId,
				game.amount,
				winning,
				winning,
				[],
				'blackjack',
				{ active: true, visible: true, gameid: game.id, countdown: 0 },
				function(err2, newxp, newbalance){
					if(err2) {
						emitSocketToUser(socket, 'message', 'error', { message: err2.message });
						return cooldown(false, true);
					}

					emitSocketToUser(socket, 'blackjack', 'result', {
						result: result,
						state: getPublicState(userId, true)
					});

					delete games[userId];

					userService.updateLevel(userId, newxp);
					userService.updateBalance(userId, 'main', newbalance);

					if(winning >= config.games.winning_to_chat){
						chatService.writeSystemMessage(user.name + ' won ' + getFormatAmountString(winning) + ' on blackjack!', 'all', true, null);
					}

					loggerTrace('[BLACKJACK] Finished. ' + user.name + ' result=' + result + ' winning=$' + getFormatAmountString(winning));

					cooldown(false, false);
				}
			);
		}
	);
}

function resolveDealerPlay(game){
	while(true){
		var dealerValue = blackjackLogic.calculateHandValue(game.dealer);
		if(dealerValue.total > 21) break;

		// Dealer stands on soft 17 (common casino rule, reduces ambiguity).
		if(dealerValue.total > 17) break;
		if(dealerValue.total === 17 && dealerValue.isSoft) break;
		if(dealerValue.total === 17 && !dealerValue.isSoft) break;
		if(dealerValue.total < 17){
			game.dealer.push(dealNext(game));
			continue;
		}
		break;
	}
}

/* ----- CLIENT USAGE ----- */
function placeBet(user, socket, amount, cooldown){
	cooldown(true, true);

	if(games[user.userid] !== undefined) {
		emitSocketToUser(socket, 'message', 'error', { message: 'You\'ve already started a hand.' });
		return cooldown(false, true);
	}

	verifyFormatAmount(amount, function(err1, formatted){
		if(err1) {
			emitSocketToUser(socket, 'message', 'error', { message: err1.message });
			return cooldown(false, true);
		}

		var betAmount = formatted;
		if(betAmount < config.app.intervals.amounts['blackjack'].min || betAmount > config.app.intervals.amounts['blackjack'].max) {
			emitSocketToUser(socket, 'message', 'error', {
				message: 'Invalid bet amount [' + getFormatAmountString(config.app.intervals.amounts['blackjack'].min) + '-' + getFormatAmountString(config.app.intervals.amounts['blackjack'].max) + ']'
			});
			return cooldown(false, true);
		}

		userService.getBalance(user.userid, function(err2, balance){
			if(err2) {
				emitSocketToUser(socket, 'message', 'error', { message: err2.message });
				return cooldown(false, true);
			}

			if(balance < betAmount) {
				emitSocketToRoom(user.userid, 'modal', 'insufficient_balance', { amount: getFormatAmount(betAmount - balance) });
				emitSocketToUser(socket, 'message', 'error', { message: 'You don\'t have enough money' });
				return cooldown(false, true);
			}

			fairService.getUserSeeds(user.userid, function(err3, fair){
				if(err3) {
					emitSocketToUser(socket, 'message', 'error', { message: err3.message });
					return cooldown(false, true);
				}

				userService.registerOriginalBet(user.userid, betAmount, [], 'blackjack', function(err4, newbalance){
					if(err4) {
						emitSocketToUser(socket, 'message', 'error', { message: err4.message });
						return cooldown(false, true);
					}

					var seed = fairService.getCombinedSeed(fair.server_seed, fair.client_seed, fair.nonce);
					var salt = fairService.generateSaltHash(seed);
					var deck = fairService.getShuffle(salt, 52);

					var player = [ deck[0], deck[2] ];
					var dealer = [ deck[1], deck[3] ];
					var position = 4;

					var deckEncoded = blackjackLogic.encodeCards(deck);

					pool.query(
						'INSERT INTO `blackjack_bets` SET `userid` = ' + pool.escape(user.userid) +
						', `name` = ' + pool.escape(user.name) +
						', `avatar` = ' + pool.escape(user.avatar) +
						', `xp` = ' + parseInt(user.xp) +
						', `amount` = ' + betAmount +
						', `player` = ' + pool.escape(blackjackLogic.encodeCards(player)) +
						', `dealer` = ' + pool.escape(blackjackLogic.encodeCards(dealer)) +
						', `deck` = ' + pool.escape(deckEncoded) +
						', `position` = ' + pool.escape(position) +
						', `server_seedid` = ' + pool.escape(fair.server_seedid) +
						', `client_seedid` = ' + pool.escape(fair.client_seedid) +
						', `nonce` = ' + pool.escape(fair.nonce) +
						', `time` = ' + pool.escape(time()),
						function(err5, row5){
							if(err5) {
								emitSocketToUser(socket, 'message', 'error', { message: 'An error occurred while placing bet (1)' });
								return cooldown(false, true);
							}

							pool.query(
								'UPDATE `users_seeds_server` SET `nonce` = `nonce` + 1 WHERE `userid` = ' + pool.escape(user.userid) + ' AND `id` = ' + pool.escape(fair.server_seedid),
								function(err6){
									if(err6) {
										emitSocketToUser(socket, 'message', 'error', { message: 'An error occurred while placing bet (2)' });
										return cooldown(false, true);
									}

									var game = {
										id: row5.insertId,
										amount: betAmount,
										player: player,
										dealer: dealer,
										deck: deck,
										position: position
									};

									var playerValue = blackjackLogic.calculateHandValue(player);
									var dealerValue = blackjackLogic.calculateHandValue(dealer);

									// Immediate resolution: blackjack(s).
									if(playerValue.isBlackjack || dealerValue.isBlackjack){
										var result = 'loss';
										var winning = 0;

										if(playerValue.isBlackjack && dealerValue.isBlackjack){
											result = 'push';
											winning = getFormatAmount(betAmount);
										} else if(playerValue.isBlackjack){
											result = 'blackjack';
											var profit = betAmount * 1.5;
											var adjustedProfit = applyHouseEdgeToProfit(profit);
											winning = getFormatAmount(betAmount + adjustedProfit);
										}

										// Store in memory briefly for settlement helper.
										games[user.userid] = game;
										settleAndFinish(user, socket, game, result, winning, cooldown);

										userService.updateBalance(user.userid, 'main', newbalance);

										return;
									}

									games[user.userid] = game;

									emitSocketToUser(socket, 'blackjack', 'bet_confirmed', {
										state: getPublicState(user.userid, false)
									});

									userService.updateBalance(user.userid, 'main', newbalance);

									loggerTrace('[BLACKJACK] Bet registered. ' + user.name + ' did bet $' + getFormatAmountString(betAmount));

									cooldown(false, false);
								}
							);
						}
					);
				});
			});
		});
	});
}

/* ----- CLIENT USAGE ----- */
function hit(user, socket, cooldown){
	cooldown(true, true);

	var game = games[user.userid];
	if(!game){
		emitSocketToUser(socket, 'message', 'error', { message: 'The hand is not started!' });
		return cooldown(false, true);
	}

	try {
		game.player.push(dealNext(game));
	} catch (e) {
		emitSocketToUser(socket, 'message', 'error', { message: 'Unable to draw card.' });
		return cooldown(false, true);
	}

	var playerValue = blackjackLogic.calculateHandValue(game.player);

	if(playerValue.isBust){
		return settleAndFinish(user, socket, game, 'loss', 0, cooldown);
	}

	// Auto-stand at 21.
	if(playerValue.total >= 21){
		return stand(user, socket, cooldown);
	}

	pool.query(
		'UPDATE `blackjack_bets` SET `player` = ' + pool.escape(blackjackLogic.encodeCards(game.player)) +
		', `position` = ' + pool.escape(game.position) +
		' WHERE `id` = ' + pool.escape(game.id),
		function(err1){
			if(err1){
				emitSocketToUser(socket, 'message', 'error', { message: 'An error occurred while updating hand (1)' });
				return cooldown(false, true);
			}

			emitSocketToUser(socket, 'blackjack', 'state', { state: getPublicState(user.userid, false) });
			cooldown(false, false);
		}
	);
}

/* ----- CLIENT USAGE ----- */
function stand(user, socket, cooldown){
	cooldown(true, true);

	var game = games[user.userid];
	if(!game){
		emitSocketToUser(socket, 'message', 'error', { message: 'The hand is not started!' });
		return cooldown(false, true);
	}

	resolveDealerPlay(game);

	var playerValue = blackjackLogic.calculateHandValue(game.player);
	var dealerValue = blackjackLogic.calculateHandValue(game.dealer);

	var result = 'loss';
	var winning = 0;

	if(playerValue.isBust){
		result = 'loss';
		winning = 0;
	} else if(dealerValue.isBust){
		result = 'win';
		var profitWin = game.amount; // 1:1 payout
		winning = getFormatAmount(game.amount + applyHouseEdgeToProfit(profitWin));
	} else if(playerValue.total > dealerValue.total){
		result = 'win';
		var profit = game.amount;
		winning = getFormatAmount(game.amount + applyHouseEdgeToProfit(profit));
	} else if(playerValue.total < dealerValue.total){
		result = 'loss';
		winning = 0;
	} else {
		result = 'push';
		winning = getFormatAmount(game.amount);
	}

	settleAndFinish(user, socket, game, result, winning, cooldown);
}

module.exports = {
	loadGames,
	games,
    getPublicState,
	placeBet,
	hit,
	stand
};

