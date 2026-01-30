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
	loggerDebug('[TOWER] Loading Games');

	pool.query('SELECT * FROM `tower_bets` WHERE `ended` = 0', function(err1, row1) {
		if(err1) {
            loggerInfo('[TOWER] Error In Loading Games');

            return setTimeout(function(){
                loadGames();
            }, 1000);
        }

		if(row1.length <= 0) return;

		row1.forEach(function(tower){
			var amount = getFormatAmount(tower.amount)

			if(games[tower.userid] === undefined){
				games[tower.userid] = {
					id: tower.id,
					amount: tower.amount,
					difficulty: tower.difficulty,
					route: (tower.route) ? tower.route.split('') : [],
					tower: (tower.roll) ? tower.roll.split('') : [],
					roll: tower.roll
				};
			}
		});
	});
}

/* ----- CLIENT USAGE ----- */
function placeBet(user, socket, amount, difficulty, cooldown){
	cooldown(true, true);

	if(games[user.userid] !== undefined) {
		emitSocketToUser(socket, 'message', 'error', {
			message: 'You\'ve already started a game.'
		});

		return cooldown(false, true);
	}

	/* CHECK DATA */

	var allowed_difficulties = [ 'easy', 'medium', 'hard', 'expert', 'master' ];
	if(!allowed_difficulties.includes(difficulty)) {
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid difficulty [easy, medium, hard, expert, master]!'
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

            if(amount < config.app.intervals.amounts['tower'].min || amount > config.app.intervals.amounts['tower'].max) {
                emitSocketToUser(socket, 'message', 'error', {
                    message: 'Invalid bet amount [' + getFormatAmountString(config.app.intervals.amounts['tower'].min) + '-' + getFormatAmountString(config.app.intervals.amounts['tower'].max) + ']'
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
                userService.registerOriginalBet(user.userid, amount, [], 'tower', function(err4, newbalance){
                    if(err4) {
                        emitSocketToUser(socket, 'message', 'error', {
                            message: err4.message
                        });

                        return cooldown(false, true);
                    }

                    var seed = fairService.getCombinedSeed(fair.server_seed, fair.client_seed, fair.nonce);

                    var salt = fairService.generateSaltHash(seed);
                    var array = fairService.getRollTower(salt, config.games.games.tower.tiles[difficulty].total);

                    var roll = array.join('');

                    pool.query('INSERT INTO `tower_bets` SET `userid` = ' + pool.escape(user.userid) + ', `name` = ' + pool.escape(user.name) + ', `avatar` = ' + pool.escape(user.avatar) + ', `xp` = ' + parseInt(user.xp) + ', `amount` = ' + amount + ', `difficulty` = ' + pool.escape(difficulty) + ', `roll` = ' + pool.escape(roll) + ', `server_seedid` = ' + pool.escape(fair.server_seedid) + ', `client_seedid` = ' + pool.escape(fair.client_seedid) + ', `nonce` = ' + pool.escape(fair.nonce) + ', `time` = ' + pool.escape(time()), function(err5, row5) {
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
                                difficulty: difficulty,
                                route: [],
                                tower: array,
                                roll: roll
                            };

                            emitSocketToUser(socket, 'tower', 'bet_confirmed', {
                                stage: games[user.userid]['route'].length,
                                total: amount,
                                profit: 0
                            });

                            userService.updateBalance(user.userid, 'main', newbalance);

                            loggerTrace('[TOWER] Bet registed. ' + user.name + ' did bet $' + getFormatAmountString(amount));

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

	var route = games[user.userid]['route'].join('');

	var winning = getFormatAmount(games[user.userid]['amount'] * generateMultipliers(games[user.userid]['difficulty'])[games[user.userid]['route'].length - 1]);

	pool.query('UPDATE `tower_bets` SET `route` = ' + pool.escape(route) + ', `winning` = ' + winning + ', `ended` = 1, `cashout` = 1 WHERE `id` = ' + pool.escape(games[user.userid]['id']), function(err1){
		if(err1) {
			emitSocketToUser(socket, 'message', 'error', {
                message: 'An error occurred while cashouting bet (1)'
            });

			return cooldown(false, true);
		}

		//FINISH BET
		userService.finishOriginalBet(user.userid, games[user.userid]['amount'], winning, winning, [], 'tower', {
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

			emitSocketToUser(socket, 'tower', 'result_stage', {
				result: 'lose',
				data: {
					tower: games[user.userid]['tower'],
					difficulty: games[user.userid]['difficulty'],
					win: true
				}
			});

			delete games[user.userid];

			userService.updateLevel(user.userid, newxp);
			userService.updateBalance(user.userid, 'main', newbalance);

			if(winning >= config.games.winning_to_chat){
				var send_message = user.name + ' won ' + getFormatAmountString(winning) + ' to tower!';
				chatService.writeSystemMessage(send_message, 'all', true, null);
			}

			loggerTrace('[TOWER] Win registed. ' + user.name + ' did win $' + getFormatAmountString(winning));

			cooldown(false, false);
		});
	});
}

/* ----- CLIENT USAGE ----- */
function checkStage(user, socket, stage, button, cooldown){
	cooldown(true, true);

	if(games[user.userid] === undefined) {
		emitSocketToUser(socket, 'message', 'error', {
			message: 'The game is not started!'
		});

		return cooldown(false, true);
	}

	/* CHECK DATA */

	if(isNaN(Number(stage))){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid stage.'
		});

		return cooldown(false, true);
	}

	stage = parseInt(stage);

	if(stage < 0 || stage > 9) {
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid stage.'
		});

		return cooldown(false, true);
	}

	if(isNaN(Number(button))){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid code button.'
		});

		return cooldown(false, true);
	}

	button = parseInt(button);

	if(button < 0 || button >= config.games.games.tower.tiles[games[user.userid]['difficulty']].total) {
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid code button.'
		});

		return cooldown(false, true);
	}

	/* END CHECK DATA */

	if(stage < games[user.userid]['route'].length){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Stage already reached'
		});

		return cooldown(false, true);
	}

	if(stage > games[user.userid]['route'].length){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Stage not reached yet'
		});

		return cooldown(false, true);
	}

	var win = games[user.userid]['tower'][games[user.userid]['route'].length] == button;
	if([ 'expert', 'master' ].includes(games[user.userid]['difficulty'])) win = !win;

	if(win){
		games[user.userid]['route'].push(button);

		var route = games[user.userid]['route'].join('');

		pool.query('UPDATE `tower_bets` SET `route` = ' + pool.escape(route) + ', `ended` = 1 WHERE `id` = ' + pool.escape(games[user.userid]['id']), function(err1){
			if(err1) {
				emitSocketToUser(socket, 'message', 'error', {
                    message: 'An error occurred while checking stage (1)'
                });

				return cooldown(false, true);
			}

			//FINISH BET
			userService.finishOriginalBet(user.userid, games[user.userid]['amount'], 0, 0, [], 'tower', {
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

				emitSocketToUser(socket, 'tower', 'result_stage', {
					result: 'lose',
					data: {
						tower: games[user.userid]['tower'],
						difficulty: games[user.userid]['difficulty'],
						win: false
					}
				});

				delete games[user.userid];

                userService.updateLevel(user.userid, newxp);

				cooldown(false, false);
			});
		});
	} else {
		games[user.userid]['route'].push(button);

		var route = games[user.userid]['route'].join('');

		pool.query('UPDATE `tower_bets` SET `route` = ' + pool.escape(route) + ' WHERE `id` = ' + pool.escape(games[user.userid]['id']), function(err1){
			if(err1) {
				emitSocketToUser(socket, 'message', 'error', {
                    message: 'An error occurred while checking stage (2)'
                });

				return cooldown(false, true);
			}

			var winning = getFormatAmount(games[user.userid]['amount'] * generateMultipliers(games[user.userid]['difficulty'])[games[user.userid]['route'].length - 1]);

			emitSocketToUser(socket, 'tower', 'result_stage', {
				result: 'win',
				data: {
					stage: games[user.userid]['route'].length - 1,
					button: button,
					total: winning,
					profit: getFormatAmount(winning - games[user.userid]['amount'])
				}
			});

			if(games[user.userid]['route'].length < 9) {
				return cooldown(false, false);
			}

			pool.query('UPDATE `tower_bets` SET `winning` = ' + winning + ', `ended` = 1, `cashout` = 1 WHERE `id` = ' + pool.escape(games[user.userid]['id']), function(err2){
				if(err2) {
					emitSocketToUser(socket, 'message', 'error', {
                        message: 'An error occurred while checking stage (3)'
                    });

					return cooldown(false, true);
				}

				//FINISH BET
				userService.finishOriginalBet(user.userid, games[user.userid]['amount'], winning, winning, [], 'tower', {
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

					emitSocketToUser(socket, 'tower', 'result_stage', {
						result: 'lose',
						data: {
							tower: games[user.userid]['tower'],
							difficulty: games[user.userid]['difficulty'],
							win: true
						}
					});

					delete games[user.userid];

					userService.updateLevel(user.userid, newxp);
					userService.updateBalance(user.userid, 'main', newbalance);

					if(winning >= config.games.winning_to_chat){
						var send_message = user.name + ' won ' + getFormatAmountString(winning) + ' to tower!';
						chatService.writeSystemMessage(send_message, 'all', true, null);
					}

					loggerTrace('[TOWER] Win registed. ' + user.name + ' did win $' + getFormatAmountString(winning));

					cooldown(false, false);
				});
			});
		});
	}
}

function generateMultipliers(difficulty){
    var multipliers = [];

    var multiplier = 1;

    for(var i = 0; i < 9; i++){
        multiplier *= config.games.games.tower.tiles[difficulty].total / config.games.games.tower.tiles[difficulty].correct;

        multipliers.push(roundedToFixed(multiplier * (100 - config.settings.games.games.original.tower.house_edge.value) / 100, 2));
    }

	return multipliers;
}

module.exports = {
	games,
	placeBet, cashoutBet, checkStage,
	loadGames, generateMultipliers
};