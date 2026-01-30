var { pool } = require('@/lib/database.js');
var { emitSocketToUser, emitSocketToRoom } = require('@/lib/socket.js');
var { loggerDebug, loggerTrace, loggerInfo } = require('@/lib/logger.js');

var chatService = require('@/services/chatService.js');
var userService = require('@/services/userService.js');
var fairService = require('@/services/fairService.js');

var { time } = require('@/utils/formatDate.js');
var { roundedToFixed, getFormatAmount, getFormatAmountString, verifyFormatAmount } = require('@/utils/formatAmount.js');

var config = require('@/config/config.js');

var games = {};

function loadGames(){
	loggerDebug('[MINESWEEPER] Loading Games');

	pool.query('SELECT * FROM `minesweeper_bets` WHERE `ended` = 0', function(err1, row1) {
		if(err1) {
            loggerInfo('[MINESWEEPER] Error In Loading Games');

            return setTimeout(function(){
                loadGames();
            }, 1000);
        }

		if(row1.length <= 0) return;

		row1.forEach(function(minesweeper){
			if(games[minesweeper.userid] === undefined){
				var amount = getFormatAmount(minesweeper.amount);
				var bombs = parseInt(minesweeper.bombs);

				var route = [];
				var mines = [];

				if(minesweeper.route) for(var i = 0; i < minesweeper.route.length; i += 2) route.push(parseInt(minesweeper.route.slice(i, i + 2)));
				if(minesweeper.roll) for(var i = 0; i < minesweeper.roll.length && i / 2 < bombs; i += 2) mines.push(parseInt(minesweeper.roll.slice(i, i + 2)));

				games[minesweeper.userid] = {
					id: minesweeper.id,
					amount: amount,
					bombs: bombs,
					route: route,
					mines: mines,
					roll: minesweeper.roll
				};
			}
		});
	});
}

/* ----- CLIENT USAGE ----- */
function placeBet(user, socket, amount, bombs, cooldown){
	cooldown(true, true);

	if(games[user.userid] !== undefined) {
		emitSocketToUser(socket, 'message', 'error', {
			message: 'You\'ve already started a game!'
		});

		return cooldown(false, true);
	}

	/* CHECK DATA */

	if(isNaN(Number(bombs))){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid bombs amount!'
		});

		return cooldown(false, true);
	}

	bombs = parseInt(bombs);

	if(bombs < 1 || bombs > 24) {
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid bombs amount [1 - 24]!'
		});

		return cooldown(false, true);
	}

	/* END CHECK DATA */

	//VERIFY FORMAT AMOUNT
	verifyFormatAmount(amount, function(err1, amount){
		if(err1) {
			emitSocketToUser(socket, 'message', 'error', {
				message: err1.message
			});

			return cooldown(false, true);
		}

		//SEEDS
		fairService.getUserSeeds(user.userid, function(err2, fair){
			if(err2) {
				emitSocketToUser(socket, 'message', 'error', {
					message: err2.message
				});

				return cooldown(false, true);
			}

            if(amount < config.app.intervals.amounts['minesweeper'].min || amount > config.app.intervals.amounts['minesweeper'].max) {
                emitSocketToUser(socket, 'message', 'error', {
                    message: 'Invalid bet amount [' + getFormatAmountString(config.app.intervals.amounts['minesweeper'].min) + '-' + getFormatAmountString(config.app.intervals.amounts['minesweeper'].max) + ']'
                });

                return cooldown(false, true);
            }

            //CHECK BALANCE
            userService.getBalance(user.userid, function(err3, balance){
                if(err3) {
                    emitSocketToUser(socket, 'message', 'error', {
                        message: err3.message
                    });

                    return cooldown(false, true);
                }

                if(balance < amount) {
                    emitSocketToRoom(user.userid, 'modal', 'insufficient_balance', {
                        amount: getFormatAmount(amount - balance)
                    });

                    emitSocketToUser(socket, 'message', 'error', {
                        message: 'You don\'t have enough money'
                    });

                    return cooldown(false, true);
                }

                //REGISTER BET
                userService.registerOriginalBet(user.userid, amount, [], 'minesweeper', function(err4, newbalance){
                    if(err4) {
                        emitSocketToUser(socket, 'message', 'error', {
                            message: err4.message
                        });

                        return cooldown(false, true);
                    }

                    var seed = fairService.getCombinedSeed(fair.server_seed, fair.client_seed, fair.nonce);

                    var salt = fairService.generateSaltHash(seed);
                    var array = fairService.getShuffle(salt, 25);

                    var roll = array.map(a => '0'.concat(a.toString()).slice(-2)).join('');

                    var mines = array.slice(0, bombs);

                    pool.query('INSERT INTO `minesweeper_bets` SET `userid` = ' + pool.escape(user.userid) + ', `name` = ' + pool.escape(user.name) + ', `avatar` = ' + pool.escape(user.avatar) + ', `xp` = ' + parseInt(user.xp) + ', `amount` = ' + amount + ', `bombs` = ' + bombs + ', `roll` = ' + pool.escape(roll) + ', `server_seedid` = ' + pool.escape(fair.server_seedid) + ', `client_seedid` = ' + pool.escape(fair.client_seedid) + ', `nonce` = ' + pool.escape(fair.nonce) + ', `time` = '+ pool.escape(time()), function(err5, row5) {
                        if(err5) {
                            emitSocketToUser(socket, 'message', 'error', {
                                message: 'An error occurred while placing bet (1)'
                            });

                            return cooldown(false, true);
                        }

                        pool.query('UPDATE `users_seeds_server` SET `nonce` = `nonce` + 1 WHERE `userid` = ' + pool.escape(user.userid) + ' AND `id` = ' + pool.escape(fair.server_seedid), function(err6){
                            if(err6) {
                                emitSocketToUser(socket, 'message', 'error', {
                                    message: 'An error occurred while placing bet (2)'
                                });

                                return cooldown(false, true);
                            }

                            games[user.userid] = {
                                id: row5.insertId,
                                amount: amount,
                                bombs: bombs,
                                route: [],
                                mines: mines,
                                roll: roll
                            };

                            emitSocketToUser(socket, 'minesweeper', 'bet_confirmed', {
                                total: amount,
                                profit: 0
                            });

                            userService.updateBalance(user.userid, 'main', newbalance);

                            loggerTrace('[MINESWEEPER] Bet registed. ' + user.name + ' did bet $' + getFormatAmountString(amount));

                            cooldown(false, false);
                        });
                    });
                });
            });
		});
	});
}

/* ----- CLIENT USAGE ----- */
function cashoutBet(user, socket, cooldown){
	cooldown(true, true);

	if(games[user.userid] === undefined) {
		emitSocketToUser(socket, 'message', 'error', {
			message: 'The game is not started!'
		});

		return cooldown(false, true);
	}

	if(games[user.userid]['route'].length == 0){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'You need to play one time to withdraw your winnings!'
		});

		return cooldown(false, true);
	}

	var route = games[user.userid]['route'].map(a => '0'.concat(a.toString()).slice(-2)).join('');

	var winning = getFormatAmount(games[user.userid]['amount'] * generateMultipliers(games[user.userid]['bombs'])[games[user.userid]['route'].length - 1]);

	pool.query('UPDATE `minesweeper_bets` SET `route` = ' + pool.escape(route) + ', `winning` = ' + winning + ', `ended` = 1, `cashout` = 1 WHERE `id` = ' + pool.escape(games[user.userid]['id']), function(err1){
		if(err1) {
			emitSocketToUser(socket, 'message', 'error', {
                message: 'An error occurred while cashouting bet (1)'
            });

			return cooldown(false, true);
		}

		//FINISH BET
		userService.finishOriginalBet(user.userid, games[user.userid]['amount'], winning, winning, [], 'minesweeper', {
			active: true,
			visible: true,
			gameid: games[user.userid]['id'],
			countdown: 0
		}, function(err2, newxp, newbalance){
			if(err2) {
				emitSocketToUser(socket, 'message', 'error', {
					message: err2.message
				});

				return cooldown(false, true);
			}

			emitSocketToUser(socket, 'minesweeper', 'result_bomb', {
				result: 'lose',
				data: {
					mines: games[user.userid]['mines'],
					win: true
				}
			});

			delete games[user.userid];

			userService.updateLevel(user.userid, newxp);
			userService.updateBalance(user.userid, 'main', newbalance);

			if(winning >= config.games.winning_to_chat){
				var send_message = user.name + ' won ' + getFormatAmountString(winning) + ' to minesweeper!';
				chatService.writeSystemMessage(send_message, 'all', true, null);
			}

			loggerTrace('[MINESWEEPER] Win registed. ' + user.name + ' did win $' + getFormatAmountString(winning));

			cooldown(false, false);
		});
	});
}

/* ----- CLIENT USAGE ----- */
function checkBomb(user, socket, bomb, cooldown){
	cooldown(true, true);

	if(games[user.userid] === undefined) {
		emitSocketToUser(socket, 'message', 'error', {
			message: 'The game is not started!'
		});

		return cooldown(false, true);
	}

	if(games[user.userid]['route'].includes(bomb)){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'You already pressed this button!'
		});

		return cooldown(false, true);
	}

	/* CHECK DATA */

	if(isNaN(Number(bomb))){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid bomb!'
		});

		return cooldown(false, true);
	}

	bomb = parseInt(bomb);

	if(bomb < 0 || bomb > 24) {
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid bomb!'
		});

		return cooldown(false, true);
	}

	/* END CHECK DATA */

	if(games[user.userid]['mines'].includes(bomb)){
		games[user.userid]['route'].push(bomb);

		var route = games[user.userid]['route'].map(a => '0'.concat(a.toString()).slice(-2)).join('');

		pool.query('UPDATE `minesweeper_bets` SET `route` = ' + pool.escape(route) + ', `ended` = 1 WHERE `id` = ' + pool.escape(games[user.userid]['id']), function(err1){
			if(err1) {
				emitSocketToUser(socket, 'message', 'error', {
                    message: 'An error occurred while checking bomb (1)'
                });

				return cooldown(false, true);
			}

			//FINISH BET
			userService.finishOriginalBet(user.userid, games[user.userid]['amount'], 0, 0, [], 'minesweeper', {
				active: true,
				visible: true,
				gameid: games[user.userid]['id'],
				countdown: 0
			}, function(err2, newxp){
				if(err2) {
					emitSocketToUser(socket, 'message', 'error', {
						message: err2.message
					});

					return cooldown(false, true);
				}

				emitSocketToUser(socket, 'minesweeper', 'result_bomb', {
					result: 'lose',
					data: {
						mines: games[user.userid]['mines'],
						win: false
					}
				});

				delete games[user.userid];

                userService.updateLevel(user.userid, newxp);

				cooldown(false, true);
			});
		});
	} else {
		games[user.userid]['route'].push(bomb);

		var route = games[user.userid]['route'].map(a => '0'.concat(a.toString()).slice(-2)).join('');

		pool.query('UPDATE `minesweeper_bets` SET `route` = ' + pool.escape(route) + ' WHERE `id` = ' + pool.escape(games[user.userid]['id']), function(err1){
			if(err1) {
				emitSocketToUser(socket, 'message', 'error', {
                    message: 'An error occurred while checking bomb (2)'
                });

				return cooldown(false, true);
			}

			emitSocketToUser(socket, 'minesweeper', 'result_bomb', {
				result: 'win',
				data: {
					bomb: bomb,
					total: getFormatAmount(games[user.userid]['amount'] * generateMultipliers(games[user.userid]['bombs'])[games[user.userid]['route'].length - 1]),
					profit: getFormatAmount(getFormatAmount(games[user.userid]['amount'] * generateMultipliers(games[user.userid]['bombs'])[games[user.userid]['route'].length - 1]) - games[user.userid]['amount']),
					multiplier: generateMultipliers(games[user.userid]['bombs'])[games[user.userid]['route'].length - 1]
				}
			});

			if(games[user.userid]['route'].length < 25 - games[user.userid]['bombs']) {
				return cooldown(false, false);
			}

			var winning = getFormatAmount(games[user.userid]['amount'] * generateMultipliers(games[user.userid]['bombs'])[games[user.userid]['route'].length - 1]);

			pool.query('UPDATE `minesweeper_bets` SET `winning` = ' + winning + ', `ended` = 1, `cashout` = 1 WHERE `id` = ' + pool.escape(games[user.userid]['id']), function(err2){
				if(err2) {
					emitSocketToUser(socket, 'message', 'error', {
                        message: 'An error occurred while checking bomb (3)'
                    });

					return cooldown(false, true);
				}

				//FINISH BET
				userService.finishOriginalBet(user.userid, games[user.userid]['amount'], winning, winning, [], 'minesweeper', {
					active: true,
					visible: true,
					gameid: games[user.userid]['id'],
					countdown: 0
				}, function(err3, newxp, newbalance){
					if(err3) {
						emitSocketToUser(socket, 'message', 'error', {
							message: err3.message
						});

						return cooldown(false, true);
					}

					emitSocketToUser(socket, 'minesweeper', 'result_bomb', {
						result: 'lose',
						data: {
							mines: games[user.userid]['mines'],
							win: true
						}
					});

					delete games[user.userid];

					userService.updateLevel(user.userid, newxp);
					userService.updateBalance(user.userid, 'main', newbalance);

					if(winning >= config.games.winning_to_chat){
						var send_message = user.name + ' won ' + getFormatAmountString(winning) + ' to minesweeper!';
						chatService.writeSystemMessage(send_message, 'all', true, null);
					}

					loggerTrace('[MINESWEEPER] Win registed. ' + user.name + ' did win $' + getFormatAmountString(winning));

					cooldown(false, false);
				});
			});
		});
	}
}

function generateMultipliers(bombs){
	var multipliers = [];

    var multiplier = 1;

    for(var i = 0; i < 25 - bombs; i++){
        multiplier *= (25 - i) / (25 - bombs - i);

        multipliers.push(roundedToFixed(multiplier * (100 - config.settings.games.games.original.minesweeper.house_edge.value) / 100, 2));
    }

	return multipliers;
}

module.exports = {
	games,
	placeBet, cashoutBet, checkBomb,
	loadGames, generateMultipliers
};