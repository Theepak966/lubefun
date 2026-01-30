var { pool } = require('@/lib/database.js');
var { emitSocketToUser, emitSocketToAll, getSocketFromRoom } = require('@/lib/socket.js');
var { loggerInfo, loggerDebug, loggerTrace } = require('@/lib/logger.js');

var chatService = require('@/lib/chat.js');

var userService = require('@/services/userService.js');

var { getFormatAmount, getFormatAmountString, verifyFormatAmount } = require('@/utils/formatAmount.js');
var { makeDate, time } = require('@/utils/formatDate.js');
var { verifyRecaptcha, calculateLevel, getRandomInt } = require('@/utils/utils.js');

var config = require('@/config/config.js');

var gameProperties = {
	id: 0,
	status: 'waiting',
	amount: 0,
	roll: null,
	timeout: null
};

var lastGame = {
	value: null
};

var totalBets = [];
var userBets = {};

function initializeGame(){
	loggerDebug('[RAIN] Loaded Game');

	pool.query('SELECT * FROM `rain_history` WHERE `ended` = 0', function(err1, row1) {
		if(err1) return;

		if(row1.length <= 0) return createGame();

        Object.assign(gameProperties, {
            id: row1[0].id,
            status: 'waiting',
            amount: getFormatAmount(row1[0].amount),
            roll: null,
            timeout: null
        });

		pool.query('SELECT `finish` FROM `rain_history` WHERE `ended` = 1 ORDER BY `id` DESC LIMIT 1', function(err2, row2) {
			if(err2) return;

			if(row2.length > 0) lastGame.value = row2[0].finish;

			pool.query('SELECT * FROM `rain_bets` WHERE `rain` = ' + parseInt(row1[0].id), function(err3, row3) {
				if(err3) return;

				row3.forEach(function(item){
					if(userBets[item.userid] === undefined) userBets[item.userid] = 0;
					userBets[item.userid]++;

					totalBets.push({
						id: item.id,
						userid: item.userid,
						tickets: parseInt(item.tickets)
					});
				});

				pool.query('SELECT COALESCE(SUM(amount), 0) AS `amount` FROM `rain_tips` WHERE `rain` = ' + parseInt(row1[0].id), function(err4, row4) {
					if(err4) return;

					if(row4.length > 0) gameProperties.amount += getFormatAmount(row4[0].amount);

					if(row1[0].finish <= time()) return rollGame();

                    loggerInfo('[RAIN] Loaded the last game. Rolling after ' + Math.floor(row1[0].finish - time()) + ' seconds');

                    emitSocketToAll('rain', 'waiting', {
                        last: lastGame.value,
                        amount: gameProperties.amount
                    });

                    gameProperties.timeout = setTimeout(function(){
                        rollGame();
                    }, Math.floor(row1[0].finish - time()) * 1000);
				});
			});
		});
	});
}

/* ----- INTERNAL USAGE ----- */
function createGame(){
	pool.query('SELECT `finish` FROM `rain_history` WHERE `ended` = 1 ORDER BY `id` DESC LIMIT 1', function(err1, row1) {
		if(err1) return;

		if(row1.length > 0) lastGame.value = row1[0].finish;

		var amount = getFormatAmount(config.app.rain.start);
		var seconds = getRandomInt(config.app.rain.timeout_interval.min, config.app.rain.timeout_interval.max);

		pool.query('INSERT INTO `rain_history` SET `amount` = ' + amount + ', `finish` = ' + pool.escape(time() + seconds) + ', `time` = ' + pool.escape(time()), function(err2, row2) {
			if(err2) return;

			loggerInfo('[RAIN] Creating a new one. Rolling after ' + seconds + ' seconds');

			Object.assign(gameProperties, {
				id: row2.insertId,
				status: 'waiting',
				amount: amount,
				roll: null,
				timeout: null
			});

			emitSocketToAll('rain', 'waiting', {
				last: lastGame.value,
				amount: gameProperties.amount
			});

			gameProperties.timeout = setTimeout(function(){
				rollGame();
			}, seconds * 1000);
		});
	});
}

function rollGame(){
	loggerInfo('[RAIN] Rolling');

	if(gameProperties.timeout) clearTimeout(gameProperties.timeout);

	gameProperties.status = 'started';
	gameProperties.roll = time();

	emitSocketToAll('rain', 'started', {
		time: config.app.rain.cooldown_start,
		cooldown: config.app.rain.cooldown_start,
		amount: gameProperties.amount,
		joined: 0
	});

	setTimeout(function(){
		gameProperties.status = 'ended';

		var bets = totalBets.slice().sort((a, b) => b.tickets - a.tickets);
		var amount = getFormatAmount(gameProperties.amount);
		var winnings = {};

		while(bets.length > 0){
			var tickets = bets.reduce((acc, cur) => acc + cur.tickets, 0);

			var winning = getFormatAmount(amount * bets[0].tickets / tickets);

			winnings[bets[0].userid] = winning;
			amount = getFormatAmount(amount - winning);

			bets.shift();
		}

		pool.query('UPDATE `rain_history` SET `ended` = 1, `finish` = ' + pool.escape(time()) + ' WHERE `id` = ' + gameProperties.id, function(err1){
			if(err1) return;

			giveWinnings(0, winnings, function(err2){
				if(err2) return;

				loggerInfo('[RAIN] Ended. A number of ' + totalBets.length + ' users have received a total of ' + getFormatAmountString(gameProperties.amount) + ' coins');

				if(totalBets.length > 0){
					var text_message = 'Rain event has ended! A number of ' + totalBets.length + ' participants have received a total of ' + getFormatAmountString(gameProperties.amount) + ' coins.';
					chatService.writeSystemMessage(text_message, 'all', true, null);
				}

				totalBets.splice(0);
				Object.keys(userBets).forEach(key => delete userBets[key]);

				createGame();
			});
		});
	}, config.app.rain.cooldown_start * 1000);
}

/* ----- INTERNAL USAGE ----- */
function giveWinnings(index, winnings, callback) {
	if(index >= Object.keys(winnings).length) return callback(null);

	var amount = getFormatAmount(winnings[Object.keys(winnings)[index]]);

	//EDIT BALANCE
	userService.editBalance(Object.keys(winnings)[index], amount, 'rain_win', function(err1, newbalance){
		if(err1) return callback(err1);

        pool.query('UPDATE `users` SET `rollover` = `rollover` + ' + amount + ' WHERE `userid` = ' + pool.escape(Object.keys(winnings)[index]), function(err2){
            if(err2) return callback(new Error('An error occurred while give winnings (1)'));

            pool.query('INSERT INTO `rain_winnings` SET `userid` = ' + pool.escape(Object.keys(winnings)[index]) + ', `winning` = ' + amount + ', `rain` = ' + pool.escape(gameProperties.id) + ', `time` = ' + pool.escape(time()), function(err3){
                if(err3) return callback(new Error('An error occurred while give winnings (2)'));

                userService.updateBalance(Object.keys(winnings)[index], 'main', newbalance);

                var text_message = 'Congratulations! You have receive ' + getFormatAmountString(amount) + ' coins from rain.';
                chatService.writeSystemMessage(text_message, null, null, getSocketFromRoom(Object.keys(winnings)[index]));

                giveWinnings(index + 1, winnings, callback);
            });
        });
	});
}

/* ----- CLIENT USAGE ----- */
function joinGame(user, socket, recaptcha, cooldown){
	cooldown(true, true);

	if(user.exclusion > time()) {
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Your exclusion expires ' + makeDate(new Date(user.exclusion * 1000)) + '.'
		});

		return cooldown(false, true);
	}

	verifyRecaptcha(recaptcha, function(verified){
		if(!verified){
			emitSocketToUser(socket, 'message', 'error', {
				message: 'Invalid recaptcha!'
			});

			return cooldown(false, true);
		}

		if(calculateLevel(user.xp).level < 1) {
			emitSocketToUser(socket, 'message', 'error', {
				message: 'You must to have minimum 1 level!'
			});

			return cooldown(false, true);
		}

		if(gameProperties.status != 'started') {
			emitSocketToUser(socket, 'message', 'error', {
				message: 'Wait for starting the rain!'
			});

			return cooldown(false, true);
		}

		if(userBets[user.userid] !== undefined && userBets[user.userid] >= 1) {
			emitSocketToUser(socket, 'message', 'error', {
				message: 'You have already entered in rain!'
			});

			return cooldown(false, true);
		}

		var tickets = calculateLevel(user.xp).level;

		pool.query('INSERT INTO `rain_bets` SET `userid` = ' + pool.escape(user.userid) + ', `tickets` = ' + tickets + ', `rain` = ' + gameProperties.id + ', `time` = ' + pool.escape(time()), function(err1, row1){
			if(err1) {
				emitSocketToUser(socket, 'message', 'error', {
                    message: 'An error occurred while joining game (1)'
                });

				return cooldown(false, true);
			}

			//EDIT BALANCE
			userService.editBalance(user.userid, 0, 'rain_join', function(err2, newbalance){
				if(err2) {
					emitSocketToUser(socket, 'message', 'error', {
                        message: err2.message
                    });

					return cooldown(false, true);
				}

				if(userBets[user.userid] === undefined) userBets[user.userid] = 0;
				userBets[user.userid]++;

				totalBets.push({
					id: row1.insertId,
					userid: user.userid,
					tickets: tickets
				});

				emitSocketToUser(socket, 'rain', 'joined');

				userService.updateBalance(user.userid, 'main', newbalance);

				emitSocketToUser(socket, 'message', 'success', {
					message: 'You successfully joined to rain!'
				});

				loggerTrace('[RAIN] Join registed. ' + user.name + ' joined to rain.');

				cooldown(false, false);
			});
		});
	});
}

/* ----- CLIENT USAGE ----- */
function tipGame(user, socket, amount, cooldown){
	cooldown(true, true);

	if(gameProperties.status != 'waiting') {
		emitSocketToUser(socket, 'message', 'error', {
			message: 'You can only tip coins to rain until starts!'
		});

		return cooldown(false, true);
	}

	verifyFormatAmount(amount, function(err1, amount){
		if(err1){
			emitSocketToUser(socket, 'message', 'error', {
				message: err1.message
			});

			return cooldown(false, true);
		}

		if(amount < config.app.intervals.amounts.tip_rain.min || amount > config.app.intervals.amounts.tip_rain.max) {
			emitSocketToUser(socket, 'message', 'error', {
				message: 'Invalid tip rain amount [' + getFormatAmountString(config.app.intervals.amounts.tip_rain.min) + '-' + getFormatAmountString(config.app.intervals.amounts.tip_rain.max) + ']!'
			});

			return cooldown(false, true);
		}

		if(getFormatAmount(user.balance) < amount) {
			emitSocketToUser(socket, 'message', 'error', {
				message: 'You don\'t have enough money!'
			});

			emitSocketToUser(socket, 'modal', 'insufficient_balance', {
				amount: getFormatAmount(amount - user.balance)
			});

			return cooldown(false, true);
		}

		//EDIT BALANCE
		userService.editBalance(user.userid, -amount, 'rain_tip', function(err2, newbalance){
			if(err2) {
				emitSocketToUser(socket, 'message', 'error', {
                    message: err2.message
                });

				return cooldown(false, true);
			}

			pool.query('INSERT INTO `rain_tips` SET `userid` = ' + pool.escape(user.userid) + ', `amount` = ' + amount + ', `rain` = ' + gameProperties.id + ', `time` = ' + pool.escape(time()), function(err3) {
				if(err3) {
					emitSocketToUser(socket, 'message', 'error', {
                        message: 'An error occurred while tipping game (1)'
                    });

					return cooldown(false, true);
				}

				userService.updateBalance(user.userid, 'main', newbalance);

				gameProperties.amount += amount;

				emitSocketToAll('rain', 'amount', {
					amount: gameProperties.amount
				});

				emitSocketToUser(socket, 'message', 'success', {
					message: 'You successfully tip ' + getFormatAmountString(amount) + ' coins to rain!'
				});

				var text_message = user.name + ' just tip ' + getFormatAmountString(amount) + ' coins to rain.';
				chatService.writeSystemMessage(text_message, 'all', true, null);

				loggerTrace('[RAIN] Tip registed. ' + user.name + ' tip ' + getFormatAmountString(amount) + ' coins');

				cooldown(false, false);
			});
		});
	});
}

module.exports = {
	gameProperties, lastGame, totalBets, userBets,
	initializeGame, rollGame,
	joinGame, tipGame
};