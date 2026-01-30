var sha256 = require('sha256');

var { pool } = require('@/lib/database.js');
var { emitSocketToUser, emitSocketToRoom } = require('@/lib/socket.js');
var { loggerInfo, loggerDebug, loggerTrace } = require('@/lib/logger.js');

var chatService = require('@/services/chatService.js');
var userService = require('@/services/userService.js');
var fairService = require('@/services/fairService.js');

var { time } = require('@/utils/formatDate.js');
var { getFormatAmount, getFormatAmountString, verifyFormatAmount } = require('@/utils/formatAmount.js');
var { calculateLevel, getAmountCommission } = require('@/utils/utils.js');

var config = require('@/config/config.js');

var games = {};
var secure = {};

function loadGames(){
	loggerDebug('[COINFLIP] Loading Games');

	pool.query('SELECT * FROM `coinflip_games` WHERE `ended` = 0 AND `canceled` = 0', function(err1, row1) {
		if(err1) return;

		if(row1.length <= 0) return;

		row1.reverse();

		row1.forEach(function(coinflip){
			var amount = getFormatAmount(coinflip.amount);

			games[coinflip.id] = {
				id: coinflip.id,
				status: 0,
				players: [],
				amount: amount,
				isBotFlip: parseInt(coinflip.isBotFlip) === 1,
				fair: {
					server_seed: coinflip.server_seed,
					public_seed: null,
					block: null,
					roll: null
				},
				time: null,
				timeout: null
			}

			secure[coinflip.id] = {};

			pool.query('SELECT * FROM `coinflip_bets` WHERE `gameid` = ' + pool.escape(coinflip.id), function(err2, row2) {
				if(err2) return;

				if(row2.length > 1) {
					games[coinflip.id].status = 1;
					games[coinflip.id].time = time();
				}

				row2.forEach(function(bet){
					games[coinflip.id].players.push({
						user: {
							userid: bet.userid,
							name: bet.name,
							avatar: bet.avatar,
							level: calculateLevel(bet.xp).level
						},
						id: parseInt(bet.id),
						position: parseInt(bet.position),
						creator: parseInt(bet.creator),
						bot: parseInt(bet.bot)
					});
				});

				if(row2.length > 1) {
					continueGame(coinflip.id);
				} else {
					if(config.games.games.coinflip.cancel){
						var creator = games[coinflip.id].players.filter(a => a.creator == 1)[0].user;

						if(coinflip.time + config.games.games.coinflip.timer_cancel > time()){
							games[coinflip.id].timeout = setTimeout(function(){
								pool.query('UPDATE `coinflip_games` SET `canceled` = 1 WHERE `id` = ' + pool.escape(coinflip.id), function(err3){
									if(err3) return;

									//REFUND BET
									userService.refundOriginalBet(creator.userid, amount, 'coinflip', function(err4, newbalance){
										if(err4) return;

										userService.updateBalance(creator.userid, 'main', newbalance);

										delete games[coinflip.id];

										loggerInfo('[COINFLIP] Bet #' + coinflip.id + ' was canceled');

										emitSocketToRoom('coinflip', 'coinflip', 'remove', {
											id: coinflip.id
										});
									});
								});
							}, (time() - coinflip.time + config.games.games.coinflip.timer_cancel) * 1000);
						} else {
							pool.query('UPDATE `coinflip_games` SET `canceled` = 1 WHERE `id` = ' + coinflip.id, function(err3){
								if(err3) return;

								//REFUND BET
								userService.refundOriginalBet(creator.userid, amount, 'coinflip', function(err4, newbalance){
									if(err4) return;

									userService.updateBalance(creator.userid, 'main', newbalance);

									delete games[coinflip.id];

									loggerInfo('[COINFLIP] Bet #' + coinflip.id + ' was canceled');

									emitSocketToRoom('coinflip', 'coinflip', 'remove', {
										id: coinflip.id
									});
								});
							});
						}
					}
				}
			});
		});
	});
}

/* ----- CLIENT USAGE ----- */
function createGame(user, socket, amount, position, cooldown) {
	cooldown(true, true);

	/* CHECK DATA */

	if(isNaN(Number(position))){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid position!'
		});

		return cooldown(false, true);
	}

	position = parseInt(position);

	var allowed_coins = [0, 1];
	if(!allowed_coins.includes(position)) {
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid position!'
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

        if(amount < config.app.intervals.amounts.coinflip.min || amount > config.app.intervals.amounts.coinflip.max) {
            emitSocketToUser(socket, 'message', 'error', {
                message: 'Invalid bet amount [' + getFormatAmountString(config.app.intervals.amounts.coinflip.min) + '-' + getFormatAmountString(config.app.intervals.amounts.coinflip.max) + ']'
            });

            return cooldown(false, true);
        }

        //CHECK BALANCE
        userService.getBalance(user.userid, function(err2, balance){
            if(err2) {
                emitSocketToUser(socket, 'message', 'error', {
                    message: err2.message
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
            userService.registerOriginalBet(user.userid, amount, [], 'coinflip', function(err3, newbalance1){
                if(err3) {
                    emitSocketToUser(socket, 'message', 'error', {
                        message: err3.message
                    });

                    return cooldown(false, true);
                }

                var server_seed = fairService.generateServerSeed();

                pool.query('INSERT INTO `coinflip_games` SET `amount` = ' + amount + ', `server_seed` = ' + pool.escape(server_seed) + ', `time` = ' + pool.escape(time()), function(err4, row4){
                    if(err4) {
                        emitSocketToUser(socket, 'message', 'error', {
                            message: 'An error occurred while creating game (1)'
                        });

                        return cooldown(false, true);
                    }

                    pool.query('INSERT INTO `coinflip_bets` SET `userid` = ' + pool.escape(user.userid) + ', `name` = ' + pool.escape(user.name) + ', `avatar` = ' + pool.escape(user.avatar) + ', `xp` = ' + parseInt(user.xp) + ', `bot` = ' + parseInt(user.bot) + ', `gameid` = ' + pool.escape(row4.insertId) + ', `position` = ' + position + ', `creator` = 1, `time` = ' + pool.escape(time()), function(err5, row5){
                        if(err5) {
                            emitSocketToUser(socket, 'message', 'error', {
                                message: 'An error occurred while creating game (2)'
                            });

                            return cooldown(false, true);
                        }

                        games[row4.insertId] = {
                            id: row4.insertId,
                            status: 0,
                            players: [],
                            amount: amount,
                            isBotFlip: false, // Real user games are never bot flips
                            fair: {
                                server_seed: server_seed,
                                public_seed: null,
                                block: null,
                                roll: null
                            },
                            time: null,
                            timeout: null
                        }

                        secure[row4.insertId] = {};

                        games[row4.insertId].players.push({
                            user: {
                                userid: user.userid,
                                name: user.name,
                                avatar: user.avatar,
                                level: calculateLevel(user.xp).level
                            },
                            id: row5.insertId,
                            position: position,
                            creator: 1,
                            bot: user.bot
                        });

                        emitSocketToUser(socket, 'coinflip', 'bet_confirmed');

                        emitSocketToRoom('coinflip', 'coinflip', 'add', {
							id: row4.insertId,
							status: games[row4.insertId].status,
							players: games[row4.insertId].players,
							amount: games[row4.insertId].amount,
							data: {
								fair: {
									server_seed_hashed: sha256(games[row4.insertId].fair.server_seed),
									nonce: row4.insertId
								}
							}
                        });

                        if(config.games.games.coinflip.cancel){
                            games[row4.insertId].timeout = setTimeout(function(){
                                pool.query('UPDATE `coinflip_games` SET `canceled` = 1 WHERE `id` = ' + pool.escape(row4.insertId), function(err6){
                                    if(err6) return;

                                    //REFUND BET
                                    userService.refundOriginalBet(user.userid, games[row4.insertId].amount, 'coinflip', function(err7, newbalance2){
                                        if(err7) return;

                                        userService.updateBalance(user.userid, 'main', newbalance2);

                                        delete games[row4.insertId];

                                        loggerInfo('[COINFLIP] Bet #' + row4.insertId + ' was canceled');

                                        emitSocketToRoom('coinflip', 'coinflip', 'remove', {
                                            id: row4.insertId
                                        });
                                    });
                                });
                            }, config.games.games.coinflip.timer_cancel * 1000);
                        }

                        userService.updateBalance(user.userid, 'main', newbalance1);

                        loggerTrace('[COINFLIP] Bet registed. ' + user.name + ' did bet $' + getFormatAmountString(amount));

                        cooldown(false, false);
                    });
                });
            });
        });
	});
}

/* ----- CLIENT USAGE ----- */
function joinGame(user, socket, id, cooldown) {
	cooldown(true, true);

	/* CHECK DATA */

	if(isNaN(Number(id))){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid game. Please join in a valid game!'
		});

		return cooldown(false, true);
	}

	id = parseInt(id);

	/* END CHECK DATA */

	if(games[id] === undefined) {
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid game. Please join in a valid game!'
		});

		return cooldown(false, true);
	}

	if(games[id].status != 0) {
		emitSocketToUser(socket, 'message', 'error', {
			message: 'This game are already ended!'
		});

		return cooldown(false, true);
	}

	// SAFETY: Block real users from joining bot-only flips
	if(games[id].isBotFlip === true) {
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Bots only play bots. This is a simulated game for liveliness.'
		});

		return cooldown(false, true);
	}

	if(games[id].players.filter(a => a.user.userid == user.userid).length > 0) {
		emitSocketToUser(socket, 'message', 'error', {
			message: 'You cannot join your game!'
		});

		return cooldown(false, true);
	}

	if(Object.keys(secure[id]).length > 0){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Another user are trying to join in this game. Please try again later!'
		});

		return cooldown(false, true);
	}

    var amount = getFormatAmount(games[id].amount);

    //CHECK BALANCE
    userService.getBalance(user.userid, function(err1, balance){
        if(err1) {
            emitSocketToUser(socket, 'message', 'error', {
                message: err1.message
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

        secure[id][user.userid] = true;

        confirmJoinGame(user, id, function(err2, newbalance){
            if(err2){
                emitSocketToUser(socket, 'message', 'error', {
                    message: err2.message
                });

                return cooldown(false, true);
            }

            emitSocketToUser(socket, 'coinflip', 'bet_confirmed');

            userService.updateBalance(user.userid, 'main', newbalance);

            cooldown(false, false);
        });
    });
}

function confirmJoinGame(user, id, callback){
	var amount = getFormatAmount(games[id].amount);
	var position = [ 1, 0 ][games[id].players[0].position];

	//REGISTER BET
	userService.registerOriginalBet(user.userid, amount, [], 'coinflip', function(err1, newbalance){
		if(err1) return callback(err1);

		pool.query('INSERT INTO `coinflip_bets` SET `userid` = ' + pool.escape(user.userid) + ', `name` = ' + pool.escape(user.name) + ', `avatar` = ' + pool.escape(user.avatar) + ', `xp` = ' + parseInt(user.xp) + ', `bot` = ' + parseInt(user.bot) + ', `gameid` = ' + pool.escape(games[id].id) + ', `position` = ' + position + ', `creator` = 0, `time` = ' + pool.escape(time()), function(err2, row2){
			if(err2) return callback(new Error('An error occurred while confirming join game (1)'));

			if(games[id].timeout != null) {
                clearTimeout(games[id].timeout);

                games[id].timeout = null;
            }

			games[id].status = 1;
			games[id].time = time();

			games[id].players.push({
				user: {
					userid: user.userid,
					name: user.name,
					avatar: user.avatar,
					level: calculateLevel(user.xp).level
				},
				id: row2.insertId,
				position: position,
				bot: user.bot,
				creator: 0
			});

			emitSocketToRoom('coinflip', 'coinflip', 'edit', {
				id: id,
				status: games[id].status,
				players: games[id].players,
				amount: games[id].amount,
				data: {
					fair: {
						server_seed_hashed: sha256(games[id].fair.server_seed),
						nonce: id
					},
					time: config.games.games.coinflip.timer_wait_start - time() + games[id].time
				}
			});

			if(games[id].status == 1) continueGame(id);

			loggerTrace('[COINFLIP] Join registed. ' + user.name + ' did bet $' + getFormatAmountString(amount));

			callback(null, newbalance);
		});
	});
}

/* ----- INTERNAL USAGE ----- */
function continueGame(id){
	delete secure[id];

	setTimeout(function(){
		fairService.generateEosSeed(function(data){
			games[id].status = 2;

			games[id].fair.block = data.block;

			emitSocketToRoom('coinflip', 'coinflip', 'edit', {
				id: id,
				status: games[id].status,
				players: games[id].players,
				amount: games[id].amount,
				data: {
					fair: {
						server_seed_hashed: sha256(games[id].fair.server_seed),
						block: games[id].fair.block,
						nonce: id
					}
				}
			});
		}, function(data){
			pool.query('UPDATE `coinflip_rolls` SET `removed` = 1 WHERE `gameid` = ' + pool.escape(id), function(err1) {
				if(err1) return;

				var seed = fairService.getCombinedSeed(games[id].fair.server_seed, data.hash, id);
				var salt = fairService.generateSaltHash(seed);

				var roll = fairService.getRoll(salt, Math.pow(10, 8)) / Math.pow(10, 8);

				pool.query('INSERT INTO `coinflip_rolls` SET `gameid` = ' + pool.escape(id) + ', `blockid` = ' + pool.escape(data.block) + ', `public_seed` = ' + pool.escape(data.hash) + ', `roll` = ' + roll + ', `time` = ' + pool.escape(time()), function(err2) {
					if(err2) return;

					games[id].status = 3;

					games[id].fair.public_seed = data.hash;
					games[id].fair.block = data.block;
					games[id].fair.roll = roll;

					emitSocketToRoom('coinflip', 'coinflip', 'edit', {
						id: id,
						status: games[id].status,
						players: games[id].players,
						amount: games[id].amount,
						data: {
							fair: {
								server_seed_hashed: sha256(games[id].fair.server_seed),
								block: games[id].fair.block,
								nonce: id
							},
							winner: getWinner(id)
						}
					});

					setTimeout(function(){
						var winner = games[id].players.slice().filter(a => a.position == getWinner(id))[0];
						var opponent = games[id].players.slice().filter(a => a.position != winner.position)[0];

						pool.query('UPDATE `coinflip_games` SET `ended` = 1 WHERE `id` = ' + pool.escape(id), function(err3){
							if(err3) return;

							var amount = getFormatAmount(games[id].amount * 2);
							var winning = getFormatAmount(amount - getAmountCommission(amount, config.settings.games.games.original.coinflip.house_edge.value));

							pool.query('INSERT INTO `coinflip_winnings` SET `gameid` = ' + pool.escape(games[id].id) + ', `amount` = ' + winning + ', `position` = ' + pool.escape(winner.position) + ', `time` = ' + pool.escape(time()), function(err4){
								if(err4) return;

								//FINISH BET
								userService.finishOriginalBet(winner.user.userid, amount, winning, winning, [], 'coinflip', {
									active: winner.bot == 0,
									visible: true,
									gameid: winner.id,
									countdown: 0
								}, function(err5, newxp1, newbalance){
									if(err5) return;

									//FINISH BET
									userService.finishOriginalBet(opponent.user.userid, amount, 0, 0, [], 'coinflip', {
										active: opponent.bot == 0,
										visible: false,
										gameid: opponent.id,
										countdown: 0
									}, function(err6, newxp2){
										if(err6) return;

										games[id].status = 4;

										emitSocketToRoom('coinflip', 'coinflip', 'edit', {
											id: id,
											status: games[id].status,
											players: games[id].players,
											amount: games[id].amount,
											data: {
												fair: {
													server_seed_hashed: sha256(games[id].fair.server_seed),
													server_seed: games[id].fair.server_seed,
													public_seed: games[id].fair.public_seed,
													block: games[id].fair.block,
													nonce: id
												},
												winner: getWinner(id)
											}
										});

										if(winning >= config.games.winning_to_chat){
											var send_message = winner.user.name + ' won ' + getFormatAmountString(winning) + ' to coinflip!';
											chatService.writeSystemMessage(send_message, 'all', true, null);
										}

										emitSocketToRoom(winner.user.userid, 'message', 'success', {
											message: 'The game of ' + getFormatAmountString(winning) + ' on coinflip ended as win!'
										});

										emitSocketToRoom(opponent.user.userid, 'message', 'error', {
											message: 'The game of ' + getFormatAmountString(winning) + ' on coinflip ended as lose!'
										});

										setTimeout(function(){
											delete games[id];

											emitSocketToRoom('coinflip', 'coinflip', 'remove', { id });
										}, config.games.games.coinflip.timer_delete * 1000);

										userService.updateLevel(winner.user.userid, newxp1);
										userService.updateLevel(opponent.user.userid, newxp2);

										userService.updateBalance(winner.user.userid, 'main', newbalance);

										loggerTrace('[COINFLIP] Win registed. ' + winner.user.name + ' did win $' + getFormatAmountString(winning));
									});
								});
							});
						});
					}, 4000);
				});
			});
		});
	}, config.games.games.coinflip.timer_wait_start * 1000);
}

function getWinner(id){
	var separator = 0.5;

	return games[id].fair.roll < separator ? 0 : 1;
}

/* ----- SAFE BOT SYSTEM (NON-DECEPTIVE) ----- */
var botBots = [];
var botInterval = null;
var botActiveGames = [];

// Bot configuration
var BOT_ENABLED = String(process.env.BOT_ENABLED || 'false').toLowerCase() === 'true';
var BOT_MIN_AMOUNT = parseFloat(process.env.BOT_MIN_AMOUNT || '1.00');
var BOT_MAX_AMOUNT = parseFloat(process.env.BOT_MAX_AMOUNT || '250.00');
var BOT_MAX_VISIBLE = parseInt(process.env.BOT_MAX_VISIBLE || '25');
var BOT_CREATE_INTERVAL_MIN = parseInt(process.env.BOT_CREATE_INTERVAL_MIN || '6');
var BOT_CREATE_INTERVAL_MAX = parseInt(process.env.BOT_CREATE_INTERVAL_MAX || '14');
var BOT_JOIN_DELAY_MIN = parseInt(process.env.BOT_JOIN_DELAY_MIN || '2');
var BOT_JOIN_DELAY_MAX = parseInt(process.env.BOT_JOIN_DELAY_MAX || '10');

function getRandomBotName() {
	var names = [
		'LuckyPlayer', 'CoinMaster', 'FlipKing', 'BetPro', 'ChanceSeeker',
		'FlipWizard', 'CoinHunter', 'LuckyFlip', 'BetMaster', 'FlipChamp',
		'CoinLegend', 'BetHero', 'FlipStar', 'LuckyBet', 'CoinPro',
		'FlipNinja', 'BetWarrior', 'CoinElite', 'FlipGuru', 'LuckyCoin'
	];
	return names[Math.floor(Math.random() * names.length)] + Math.floor(Math.random() * 1000);
}

function getRandomBotAmount() {
	// Random amount from configurable range
	var min = BOT_MIN_AMOUNT * 100;
	var max = BOT_MAX_AMOUNT * 100;
	return Math.floor(Math.random() * (max - min + 1) + min) / 100;
}

function loadBotBots() {
	pool.query('SELECT `userid`, `name`, `avatar`, `xp`, `balance` FROM `users` WHERE `bot` = 1 LIMIT 20', function(err, rows) {
		if(err) {
			loggerDebug('[COINFLIP BOTS] Error loading bots: ' + err.message);
			return;
		}

		if(rows.length < 2) {
			// Create bots if we don't have enough
			createBotBots(10, function() {
				loadBotBots();
			});
			return;
		}

		botBots = rows.map(function(row) {
			return {
				userid: row.userid,
				name: row.name,
				avatar: row.avatar || (config.app.url + '/img/avatar.jpg'),
				xp: parseInt(row.xp) || 0,
				balance: parseFloat(row.balance) || 10000,
				bot: 1
			};
		});

		loggerDebug('[COINFLIP BOTS] Loaded ' + botBots.length + ' bots');
	});
}

function createBotBots(count, callback) {
	var created = 0;
	var total = count;

	for(var i = 0; i < count; i++) {
		// lib/uuid.js exports { uuid: { uuidv4, ... } }
		var userid = require('@/lib/uuid.js').uuid.uuidv4();
		var name = getRandomBotName();
		var avatar = config.app.url + '/img/avatar.jpg';

		pool.query('INSERT INTO `users` SET `bot` = 1, `userid` = ' + pool.escape(userid) + ', `name` = ' + pool.escape(name) + ', `avatar` = ' + pool.escape(avatar) + ', `balance` = 10000, `time_create` = ' + pool.escape(time()), function(err) {
			created++;
			if(created >= total) {
				if(callback) callback();
			}
		});
	}
}

function createSafeBotFlip() {
	if(!BOT_ENABLED) return;

	// Count active bot-only flips
	var activeBotFlips = Object.keys(games).filter(function(id) {
		return games[id].isBotFlip === true && games[id].status < 4;
	}).length;

	// Limit visible bot flips
	if(activeBotFlips >= BOT_MAX_VISIBLE) {
		// Remove oldest finished bot flips
		var finishedBotFlips = Object.keys(games).filter(function(id) {
			return games[id].isBotFlip === true && games[id].status === 4;
		}).sort(function(a, b) {
			return (games[a].time || 0) - (games[b].time || 0);
		});

		// Remove oldest 5 finished flips
		for(var i = 0; i < Math.min(5, finishedBotFlips.length); i++) {
			delete games[finishedBotFlips[i]];
			emitSocketToRoom('coinflip', 'coinflip', 'remove', { id: finishedBotFlips[i] });
		}
		return;
	}

	if(botBots.length < 2) {
		loadBotBots();
		return;
	}

	// Pick random bot
	var bot1 = botBots[Math.floor(Math.random() * botBots.length)];
	var amount = getRandomBotAmount();
	var position = Math.floor(Math.random() * 2); // 0 or 1

	// Ensure amount is within limits
	if(amount < config.app.intervals.amounts.coinflip.min) {
		amount = config.app.intervals.amounts.coinflip.min;
	}
	if(amount > config.app.intervals.amounts.coinflip.max) {
		amount = config.app.intervals.amounts.coinflip.max;
	}

	// Create bot user object
	var botUser = {
		userid: bot1.userid,
		name: bot1.name,
		avatar: bot1.avatar,
		xp: bot1.xp,
		bot: 1
	};

	// Create bot-only flip (simulated, no real wallet funds)
	createSafeBotFlipInternal(botUser, amount, position);
}

function createSafeBotFlipInternal(botUser, amount, position) {
	var server_seed = fairService.generateServerSeed();

	// Insert bot-only flip with isBotFlip flag
	pool.query('INSERT INTO `coinflip_games` SET `amount` = ' + amount + ', `server_seed` = ' + pool.escape(server_seed) + ', `isBotFlip` = 1, `time` = ' + pool.escape(time()), function(err, row) {
		if(err) {
			loggerDebug('[COINFLIP BOTS] Error creating bot flip: ' + err.message);
			return;
		}

		pool.query('INSERT INTO `coinflip_bets` SET `userid` = ' + pool.escape(botUser.userid) + ', `name` = ' + pool.escape(botUser.name) + ', `avatar` = ' + pool.escape(botUser.avatar) + ', `xp` = ' + parseInt(botUser.xp) + ', `bot` = 1, `gameid` = ' + pool.escape(row.insertId) + ', `position` = ' + position + ', `creator` = 1, `time` = ' + pool.escape(time()), function(err2, row2) {
			if(err2) {
				loggerDebug('[COINFLIP BOTS] Error creating bot bet: ' + err2.message);
				return;
			}

			var gameId = row.insertId;

			games[gameId] = {
				id: gameId,
				status: 0,
				players: [],
				amount: amount,
				isBotFlip: true, // Mark as bot-only flip
				fair: {
					server_seed: server_seed,
					public_seed: null,
					block: null,
					roll: null
				},
				time: null,
				timeout: null
			};

			secure[gameId] = {};

			games[gameId].players.push({
				user: {
					userid: botUser.userid,
					name: botUser.name,
					avatar: botUser.avatar,
					level: calculateLevel(botUser.xp).level
				},
				id: row2.insertId,
				position: position,
				creator: 1,
				bot: 1
			});

			// Emit bot flip (clearly marked)
			emitSocketToRoom('coinflip', 'coinflip', 'add', {
				id: gameId,
				status: games[gameId].status,
				players: games[gameId].players,
				amount: games[gameId].amount,
				isBotFlip: true, // Mark in response
				data: {
					fair: {
						server_seed_hashed: sha256(games[gameId].fair.server_seed),
						nonce: gameId
					}
				}
			});

			// Set timeout for cancel (bot flips can be canceled if no second bot joins)
			if(config.games.games.coinflip.cancel) {
				games[gameId].timeout = setTimeout(function() {
					if(!games[gameId] || games[gameId].status !== 0) return;
					
					pool.query('UPDATE `coinflip_games` SET `canceled` = 1 WHERE `id` = ' + pool.escape(gameId), function(err3) {
						if(err3) return;
						delete games[gameId];
						emitSocketToRoom('coinflip', 'coinflip', 'remove', { id: gameId });
					});
				}, config.games.games.coinflip.timer_cancel * 1000);
			}

			// Have another bot join after configurable delay (2-10 seconds)
			var joinDelay = Math.random() * (BOT_JOIN_DELAY_MAX - BOT_JOIN_DELAY_MIN) * 1000 + BOT_JOIN_DELAY_MIN * 1000;
			setTimeout(function() {
				joinBotToBotFlip(gameId);
			}, joinDelay);
		});
	});
}

function joinBotToBotFlip(gameId) {
	if(!games[gameId] || games[gameId].status != 0) return;
	if(games[gameId].players.length >= 2) return;
	if(!games[gameId].isBotFlip) return; // Only join bot-only flips

	// Find a bot that's not already in this game
	var availableBots = botBots.filter(function(bot) {
		return !games[gameId].players.some(function(p) { return p.user.userid == bot.userid; });
	});

	if(availableBots.length == 0) return;

	var bot = availableBots[Math.floor(Math.random() * availableBots.length)];
	var amount = getFormatAmount(games[gameId].amount);

	var botUser = {
		userid: bot.userid,
		name: bot.name,
		avatar: bot.avatar,
		xp: bot.xp,
		bot: 1
	};

	// For bot-only flips, we don't need real wallet operations (simulated)
	// Just confirm the join directly
	confirmJoinGame(botUser, gameId, function(err, finalBalance) {
		if(err) {
			loggerDebug('[COINFLIP BOTS] Error joining bot to flip: ' + err.message);
			return;
		}
		// No balance update needed for simulated bot flips
	});
}

function startBotSystem() {
	if(!BOT_ENABLED) {
		loggerDebug('[COINFLIP BOTS] Bot system disabled (BOT_ENABLED=false)');
		return;
	}

	loggerDebug('[COINFLIP BOTS] Starting SAFE bot system (bot-only flips, clearly labeled)');
	
	loadBotBots();

	// Create bot flips at configurable intervals (6-14 seconds)
	function scheduleNextBotFlip() {
		var interval = Math.random() * (BOT_CREATE_INTERVAL_MAX - BOT_CREATE_INTERVAL_MIN) * 1000 + BOT_CREATE_INTERVAL_MIN * 1000;
		
		setTimeout(function() {
			if(BOT_ENABLED) {
				createSafeBotFlip();
				scheduleNextBotFlip(); // Schedule next one
			}
		}, interval);
	}

	// Start scheduling
	scheduleNextBotFlip();
}

function stopBotSystem() {
	if(botInterval) {
		clearInterval(botInterval);
		botInterval = null;
	}
}

module.exports = {
	games, secure,
	loadGames, confirmJoinGame,
	createGame, joinGame, getWinner,
	startBotSystem, stopBotSystem, loadBotBots
};