var { pool } = require('@/lib/database.js');
var { emitSocketToUser, emitSocketToRoom } = require('@/lib/socket.js');
var { loggerInfo, loggerDebug, loggerTrace } = require('@/lib/logger.js');

var chatService = require('@/services/chatService.js');
var userService = require('@/services/userService.js');
var fairService = require('@/services/fairService.js');

var { time } = require('@/utils/formatDate.js');
var { roundedToFixed, getFormatAmount, getFormatAmountString, verifyFormatAmount } = require('@/utils/formatAmount.js');
var { calculateLevel } = require('@/utils/utils.js');

var config = require('@/config/config.js');

var lastGames = [];

var gameSeed = {
	id: null,
	server_seed: null,
	public_seed: null,
	uses: 0
};

var gameSettings = {
	point: 0,
	start_time: 0,
	progress_time: 0,
	end_time: 0,
	timeout: null
};

var totalBets = [];
var userBets = {};

var gameProperties = {
	status: 'ended',
	id: null,
	roll: null,
	public_seed: null,
	nonce: null
}

function initializeGame(){
	loadHistory();
	checkSeed(true);
}

/* ----- INTERNAL USAGE ----- */
function loadHistory(){
	loggerDebug('[CRASH] Loading History');

	pool.query('SELECT `point` FROM `crash_rolls` WHERE `ended` = 1 ORDER BY `id` DESC LIMIT 20', function(err1, row1) {
		if(err1) {
            loggerInfo('[CRASH] Error In Loading History');

            return setTimeout(function(){
                loadHistory();
            }, 1000);
        }

		if(row1.length <= 0) return;

		row1.reverse();

		row1.forEach(function(crash){
			lastGames.push(crash.point);
		});
	});
}

/* ----- INTERNAL USAGE ----- */
function checkSeed(start){
	pool.query('SELECT * FROM `crash_seeds` WHERE `removed` = 0 AND `time` > ' + pool.escape(time() - (24 * 60 * 60)) + ' ORDER BY `id` DESC LIMIT 1', function(err1, row1) {
		if(err1) return;

		if(row1.length <= 0) createSeed(start);
		else {
			Object.assign(gameSeed, {
				id: parseInt(row1[0].id),
				server_seed: row1[0].server_seed,
				public_seed: row1[0].public_seed,
				uses: parseInt(row1[0].uses)
			});

			if(start) checkRound();
			else generateRound();
		}
	});
}

/* ----- INTERNAL USAGE ----- */
function createSeed(start){
	loggerInfo('[CRASH] Creating New Seed');

	var server_seed = fairService.generateServerSeed();
	var public_seed = fairService.generatePublicSeed();

	pool.query('INSERT INTO `crash_seeds` SET `server_seed` = ' + pool.escape(server_seed) + ', `public_seed` = ' + pool.escape(public_seed) + ', `time` = ' + pool.escape(time()), function(err1, row1) {
		if(err1) return;

		Object.assign(gameSeed, {
			id: row1.insertId,
			server_seed: server_seed,
			public_seed: public_seed,
			uses: 0
		});

		if(start) checkRound();
		else generateRound();
	});
}

/* ----- INTERNAL USAGE ----- */
function checkRound(){
	pool.query('SELECT crash_rolls.id, crash_rolls.point, crash_seeds.public_seed, crash_rolls.nonce FROM `crash_rolls` INNER JOIN `crash_seeds` ON crash_rolls.seedid = crash_seeds.id WHERE crash_rolls.ended = 0 ORDER BY crash_rolls.id DESC LIMIT 1', function(err1, row1){
		if(err1) return;

		if(row1.length > 0){
			Object.assign(gameProperties, {
				status: 'ended',
				id: parseInt(row1[0].id),
				roll: Math.floor(parseFloat(row1[0].point) * 100),
				public_seed: row1[0].public_seed,
				nonce: parseInt(row1[0].nonce)
			});

			pool.query('SELECT * FROM `crash_bets` WHERE `gameid` = ' + parseInt(gameProperties.id), function(err2, row2){
				if(err2) return;

				row2.forEach(function(bet){
					var amount = getFormatAmount(bet.amount);

					if(userBets[bet.userid] === undefined) {
						userBets[bet.userid] = {
							id: bet.id,
							amount: amount,
							auto: Math.floor(parseFloat(bet.auto) * 100),
							cashedout: parseInt(bet.cashedout) ? true : false,
							point: parseFloat(bet.point)
						};
					}

					totalBets.push({
						id: bet.id,
						user: {
							userid: bet.userid,
							name: bet.name,
							avatar: bet.avatar,
							level: calculateLevel(bet.xp).level
						},
						amount: amount,
						auto: Math.floor(parseFloat(bet.auto) * 100)
					});

					loggerTrace('[CRASH] Bet registed. ' + bet.name + ' did bet $' + getFormatAmountString(amount));
				});
			});

			gameProperties.status = 'started';

			setTimeout(function() {
				startGame();
			}, config.games.games.crash.timer * 1000 + 1000);
		} else generateRound();
	});
}

/* ----- INTERNAL USAGE ----- */
function generateRound(){
	pool.query('SELECT `id` FROM `crash_rolls` ORDER BY `id` DESC LIMIT 1', function(err1, row1){
		if(err1) return;

		loggerInfo('[CRASH] Starting');

		emitSocketToRoom('crash', 'crash', 'reset');

		emitSocketToRoom('crash', 'crash', 'starting', {
			time: Math.floor(config.games.games.crash.timer * 1000),
			total: 0,
			profit: 0
		});

		gameSettings.start_time = new Date().getTime();

		var seedid = gameSeed.id;

		var server_seed = gameSeed.server_seed;
		var public_seed = gameSeed.public_seed;

		var nonce = 1;
		if(row1.length > 0) nonce = parseInt(row1[0].id) + 1;

		var seed = fairService.getCombinedSeed(server_seed, public_seed, nonce);
		var salt = fairService.generateSaltHash(seed);

		var roll = fairService.getRollCrash(salt);

		pool.query('INSERT INTO `crash_rolls` SET `point` = ' + roundedToFixed(roll / 100, 2) + ', `seedid` = ' + pool.escape(seedid) + ', `nonce` = ' + pool.escape(nonce) + ', `time` = ' + pool.escape(time()), function(err2, row2){
			if(err2) return;

			pool.query('UPDATE `crash_seeds` SET `uses` = `uses` + 1 WHERE `id` = ' + pool.escape(seedid), function(err3){
				if(err3) return;

				gameSeed.uses++;

				gameProperties.id = row2.insertId;
				gameProperties.roll = roll;
				gameProperties.public_seed = public_seed;
				gameProperties.nonce = nonce;

				gameProperties.status = 'started';

				emitSocketToRoom('crash', 'crash', 'fair', {
					id: gameProperties.id,
					public_seed: public_seed
				});

				setTimeout(function() {
					startGame();
				}, config.games.games.crash.timer * 1000 + 1000);
			});
		});
	});
}

/* ----- CLIENT USAGE ----- */
function placeBet(user, socket, amount, auto, cooldown) {
	cooldown(true, true);

	if(userBets[user.userid] !== undefined) {
		emitSocketToUser(socket, 'message', 'error', {
			message: 'You have already joined the crash!'
		});

		return cooldown(false, true);
	}

	if(gameProperties.status != 'started') {
		emitSocketToUser(socket, 'message', 'error', {
			message: 'The game have been already started!'
		});

		return cooldown(false, true);
	}

	/* CHECK DATA */

	if(isNaN(Number(auto))){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid auto cashout!'
		});

		return cooldown(false, true);
	}

	auto = parseInt(auto);

	if(auto <= 100 && auto != 0) {
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Auto cashout needs to be more than 1.00x!'
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

        if(amount < config.app.intervals.amounts['crash'].min || amount > config.app.intervals.amounts['crash'].max) {
            emitSocketToUser(socket, 'message', 'error', {
                message: 'Invalid bet amount [' + getFormatAmountString(config.app.intervals.amounts['crash'].min) + '-' + getFormatAmountString(config.app.intervals.amounts['crash'].max) + ']'
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
            userService.registerOriginalBet(user.userid, amount, [], 'crash', function(err3, newbalance){
                if(err3) {
                    emitSocketToUser(socket, 'message', 'error', {
                        message: err3.message
                    });

                    return cooldown(false, true);
                }

                pool.query('INSERT INTO `crash_bets` SET `userid` = ' + pool.escape(user.userid) + ', `name` = ' + pool.escape(user.name) + ', `avatar` = ' + pool.escape(user.avatar) + ', `xp` = ' + parseInt(user.xp) + ', `amount` = ' + amount + ', `gameid` = ' + parseInt(gameProperties.id) + ', `auto` = ' + roundedToFixed(auto / 100, 2) + ', `time` = ' + pool.escape(time()), function(err4, row4) {
                    if(err4) {
                        emitSocketToUser(socket, 'message', 'error', {
                            message: 'An error occurred while placing bet (1)'
                        });

                        return cooldown(false, true);
                    }

                    if(userBets[user.userid] === undefined) {
                        userBets[user.userid] = {
                            id: row4.insertId,
                            amount: amount,
                            auto: auto,
                            cashedout: false,
                            point: 0
                        };
                    }

                    emitSocketToUser(socket, 'crash', 'bet_confirmed', {
                        total: amount,
                        profit: 0
                    });

                    emitSocketToRoom('crash', 'crash', 'bet', {
                        bet: {
                            id: row4.insertId,
                            user: {
                                userid: user.userid,
                                name: user.name,
                                avatar: user.avatar,
                                level: calculateLevel(user.xp).level
                            },
                            amount: amount,
                            cashedout: false,
                            ended: false,
                            at: null,
                            profit: null
                        }
                    });

                    totalBets.push({
                        id: row4.insertId,
                        user: {
                            userid: user.userid,
                            name: user.name,
                            avatar: user.avatar,
                            level: calculateLevel(user.xp).level
                        },
                        amount: amount,
                        auto: auto
                    });

                    userService.updateBalance(user.userid, 'main', newbalance);

                    loggerTrace('[CRASH] Bet registed. ' + user.name + ' did bet $' + getFormatAmountString(amount));

                    cooldown(false, false);
                });
            });
        });
	});
}

/* ----- CLIENT USAGE ----- */
function cashoutBet(user, socket, cooldown) {
	cooldown(true, true);

	if(gameProperties.status != 'counting') {
		emitSocketToUser(socket, 'message', 'error', {
			message: 'The game is ended!'
		});

		return cooldown(false, true);
	}

	if(gameSettings.point <= 1.00) {
		emitSocketToUser(socket, 'message', 'error', {
			message: 'You can\'t cashout at least 1.00x!'
		});

		return cooldown(false, true);
	}

	if(userBets[user.userid] === undefined) {
		emitSocketToUser(socket, 'message', 'error', {
			message: 'You are not in this game!'
		});

		return cooldown(false, true);
	}

	if(userBets[user.userid]['cashedout'] == true) {
		emitSocketToUser(socket, 'message', 'error', {
			message: 'You have already cashed out!'
		});

		return cooldown(false, true);
	}

	var point = roundedToFixed(gameSettings.point, 2);

	var winning = getFormatAmount(userBets[user.userid]['amount'] * point);

	pool.query('UPDATE `crash_bets` SET `cashedout` = 1, `point` = ' + roundedToFixed(point, 2).toFixed(2) + ' WHERE `id` = ' + pool.escape(userBets[user.userid]['id']), function(err1){
		if(err1){
			emitSocketToUser(socket, 'message', 'error', {
                message: 'An error occurred while cashouting bet (1)'
            });

			return cooldown(false, true);
		}

		//FINISH BET
		userService.finishOriginalBet(user.userid, userBets[user.userid]['amount'], winning, winning, [], 'crash', {
			active: true,
			visible: true,
			gameid: userBets[user.userid]['id'],
			countdown: 0
		}, function(err2, newxp, newbalance){
			if(err2) {
				emitSocketToUser(socket, 'message', 'error', {
					message: err2.message
				});

				return cooldown(false, true);
			}

			emitSocketToRoom('crash', 'crash', 'win', {
				bet: {
					id: userBets[user.userid]['id'],
					cashout: roundedToFixed(point, 2),
					profit: getFormatAmount(winning - userBets[user.userid]['amount'])
				}
			});

			emitSocketToUser(socket, 'crash', 'cashed_out', {
				total: winning,
				profit: getFormatAmount(winning - userBets[user.userid]['amount']),
				loaded: false
			});

			userBets[user.userid]['cashedout'] = true;
			userBets[user.userid]['point'] = Math.floor(point * 100);

			if(winning >= config.games.winning_to_chat){
				var send_message = user.name + ' won ' + getFormatAmountString(winning) + ' to crash on x' + roundedToFixed(point, 2).toFixed(2) + '!';
				chatService.writeSystemMessage(send_message, 'all', true, null);
			}

			userService.updateLevel(user.userid, newxp);
			userService.updateBalance(user.userid, 'main', newbalance);

			loggerTrace('[CRASH] Win registed. ' + user.name + ' did win $' + getFormatAmountString(winning) + ' with multiplier x' + roundedToFixed(point, 2).toFixed(2));

			cooldown(false, false);
		});
	});
}

/* ----- INTERNAL USAGE ----- */
function startGame(){
	loggerInfo('[CRASH] New Round. Public Seed: ' + gameProperties.public_seed + ', Nonce: ' + gameProperties.nonce);

	gameSettings.progress_time = new Date().getTime();

	emitSocketToRoom('crash', 'crash', 'started', {
		difference: new Date().getTime() - gameSettings.progress_time
	});

	function calcCrash1(ms) {
		var gamePayout = Math.floor(100 * calcCrash2(ms)) / 100;
		return gamePayout;
	}

	function calcCrash2(ms) {
		var r = 0.00006;
		return Math.pow(Math.E, r * ms);
	}

	gameSettings.point = calcCrash1(new Date().getTime() - gameSettings.progress_time);

	gameProperties.status = 'counting';

	gameSettings.timeout = setInterval(function(){
		gameSettings.point = calcCrash1(new Date().getTime() - gameSettings.progress_time);

		checkGame();
	}, 10);
}

/* ----- INTERNAL USAGE ----- */
function checkGame(){
	if(gameProperties.status != 'counting') return;

	var point = Math.floor(gameSettings.point * 100);

	if(totalBets.length > 0){
		totalBets.forEach(function(bet){
			if(userBets[bet.user.userid]['cashedout'] == false) {
				var winning = getFormatAmount(userBets[bet.user.userid]['amount'] * point / 100);

				emitSocketToRoom(bet.user.userid, 'crash', 'cashout', {
					total: winning,
					profit: getFormatAmount(winning - userBets[bet.user.userid]['amount'])
				});
			}
		});
	}

	if(!checkingBets) checkBets(point);

	if(point >= gameProperties.roll){
		gameSettings.end_time = new Date().getTime() - gameSettings.progress_time;

		gameProperties.status = 'ended';

		clearInterval(gameSettings.timeout);

		var winners = [];
		var losers = [];
		for(var bet of totalBets) {
			if(userBets[bet.user.userid]['cashedout']) {
				winners.push(bet.user);
			} else {
				losers.push({
					id: bet.id,
					user: bet.user,
					amount: bet.amount
				});
			}
		}

		pool.query('UPDATE `crash_rolls` SET `ended` = 1 WHERE `id` = ' + parseInt(gameProperties.id), function(err1){
			if(err1) return;

			emitSocketToRoom('crash', 'crash', 'crashed', {
				number: gameProperties.roll,
				time: gameSettings.end_time,
				loaded: false,
				winners: winners.map(a => a.userid)
			});

			var bets = [];

			if(totalBets.length > 0){
				totalBets.forEach(function(bet){
					if(userBets[bet.user.userid]['cashedout'] == false) bets.push(bet.id);
				});
			}

			emitSocketToRoom('crash', 'crash', 'loss', {
				ids: bets
			});

			lastGames.push(roundedToFixed(gameProperties.roll / 100, 2));
			while(lastGames.length > 20) lastGames.shift();

			giveLosses(0, losers, function(err2){
				if(err2) return;

				setTimeout(function() {
					totalBets.splice(0);
					Object.keys(userBets).forEach(key => delete userBets[key]);

					checkSeed(false);
				}, 5000);

				loggerInfo('[CRASH] Creshed at ' + roundedToFixed(gameProperties.roll / 100, 2).toFixed(2) + 'x');
			});
		});
	}
}

/* ----- INTERNAL USAGE ----- */
function giveLosses(index, losers, callback) {
	if(index >= losers.length) return callback(null);

	//FINISH BET
	userService.finishOriginalBet(losers[index].user.userid, losers[index].amount, 0, 0, [], 'crash', {
		active: true,
		visible: false,
		gameid: userBets[losers[index].user.userid]['id'],
		countdown: 0
	}, function(err1, newxp){
		if(err1) return callback(err1);

        userService.updateLevel(losers[index].user.userid, newxp);

		giveLosses(index + 1, losers, callback);
	});
}

var checkingBets = false;

/* ----- INTERNAL USAGE ----- */
function checkBets(point){
	checkingBets = true;

	checkBet(0, point, function(err1){
		if(err1) return;

		checkingBets = false;
	});
}

/* ----- INTERNAL USAGE ----- */
function checkBet(betid, point, callback){
	if(betid >= totalBets.length) return callback(null);

	var bet = totalBets[betid];

	if(userBets[bet.user.userid]['cashedout'] == true) return checkBet(betid + 1, point, callback);

	var profit = getFormatAmount(userBets[bet.user.userid]['amount'] * gameSettings.point - userBets[bet.user.userid]['amount']);

	if(profit >= config.games.games.crash.max_profit) {
        return cashoutBetMaxProfit(bet, point, function(err1){
            if(err1) return callback(err1);

            checkBet(betid + 1, point, callback);
        });
    }

	if(userBets[bet.user.userid]['auto'] > 0){
		if(point < userBets[bet.user.userid]['auto'] || gameProperties.roll < userBets[bet.user.userid]['auto']) return checkBet(betid + 1, point, callback);

		return cashoutBetAuto(bet, point, function(err1){
			if(err1) return callback(err1);

			checkBet(betid + 1, point, callback);
		});
	}

	checkBet(betid + 1, point, callback);
}

/* ----- INTERNAL USAGE ----- */
function cashoutBetMaxProfit(bet, point, callback){
	var winning = getFormatAmount(userBets[bet.user.userid]['amount'] + config.games.games.crash.max_profit);

	pool.query('UPDATE `crash_bets` SET `cashedout` = 1, `point` = ' + roundedToFixed(winning / userBets[bet.user.userid]['amount'], 2) + ' WHERE `id` = ' + pool.escape(userBets[bet.user.userid]['id']), function(err1){
		if(err1) return callback(new Error('An error occurred while cashouting bet max profit (1)'));

		//FINISH BET
		userService.finishOriginalBet(bet.user.userid, userBets[bet.user.userid]['amount'], winning, winning, [], 'crash', {
			active: true,
			visible: true,
			gameid: userBets[bet.user.userid]['id'],
			countdown: 0
		}, function(err2, newxp, newbalance){
			if(err2) return callback(err2);

			emitSocketToRoom('crash', 'crash', 'win', {
				bet: {
					id: bet.id,
					cashout: roundedToFixed(winning / userBets[bet.user.userid]['amount'], 2),
					profit: config.games.games.crash.max_profit
				}
			});

			emitSocketToRoom(bet.user.userid, 'crash', 'cashed_out', {
				total: winning,
				profit: config.games.games.crash.max_profit,
				loaded: false
			});

			userBets[bet.user.userid]['cashedout'] = true;
			userBets[bet.user.userid]['point'] = Math.floor(winning / userBets[bet.user.userid]['amount'] * 100);

			if(winning >= config.games.winning_to_chat){
				var send_message = bet.user.name + ' won ' + getFormatAmountString(winning) + ' to crash on x' + roundedToFixed(winning / userBets[bet.user.userid]['amount'], 2).toFixed(2) + '!';
				chatService.writeSystemMessage(send_message, 'all', true, null);
			}

			userService.updateLevel(bet.user.userid, newxp);
			userService.updateBalance(bet.user.userid, 'main', newbalance);

			loggerTrace('[CRASH] Win registed. ' + bet.user.name + ' did win $' + getFormatAmountString(winning) + ' with multiplier x' + roundedToFixed(winning / userBets[bet.user.userid]['amount'], 2).toFixed(2));

			callback(null);
		});
	});
}

/* ----- INTERNAL USAGE ----- */
function cashoutBetAuto(bet, point, callback){
	var winning = getFormatAmount(userBets[bet.user.userid]['amount'] * userBets[bet.user.userid]['auto'] / 100);

	pool.query('UPDATE `crash_bets` SET `cashedout` = 1, `point` = ' + roundedToFixed(userBets[bet.user.userid]['auto'] / 100, 2) + ' WHERE `id` = ' + pool.escape(userBets[bet.user.userid]['id']), function(err1){
		if(err1) return callback(new Error('An error occurred while cashouting bet auto (1)'));

		//FINISH BET
		userService.finishOriginalBet(bet.user.userid, userBets[bet.user.userid]['amount'], winning, winning, [], 'crash', {
			active: true,
			visible: true,
			gameid: userBets[bet.user.userid]['id'],
			countdown: 0
		}, function(err2, newxp, newbalance){
			if(err2) return callback(err2);

			emitSocketToRoom('crash', 'crash', 'win', {
				bet: {
					id: bet.id,
					cashout: roundedToFixed(userBets[bet.user.userid]['auto'] / 100, 2),
					profit: getFormatAmount(winning - userBets[bet.user.userid]['amount'])
				}
			});

			emitSocketToRoom(bet.user.userid, 'crash', 'cashed_out', {
				total: winning,
				profit: getFormatAmount(winning - userBets[bet.user.userid]['amount']),
				loaded: false
			});

			userBets[bet.user.userid]['cashedout'] = true;
			userBets[bet.user.userid]['point'] = parseInt(userBets[bet.user.userid]['auto']);

			if(winning >= config.games.winning_to_chat){
				var send_message = bet.user.name + ' won ' + getFormatAmountString(winning) + ' to crash on x' + roundedToFixed(userBets[bet.user.userid]['auto'] / 100, 2).toFixed(2) + '!';
				chatService.writeSystemMessage(send_message, 'all', true, null);
			}

			userService.updateLevel(bet.user.userid, newxp);
			userService.updateBalance(bet.user.userid, 'main', newbalance);

			loggerTrace('[CRASH] Win registed. ' + bet.user.name + ' did win $' + getFormatAmountString(winning) + ' with multiplier x' + roundedToFixed(userBets[bet.user.userid]['auto'] / 100, 2).toFixed(2));

			callback(null);
		});
	});
}

module.exports = {
	lastGames, gameSettings, totalBets, userBets, gameProperties,
	initializeGame, placeBet, cashoutBet
};