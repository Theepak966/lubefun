var { pool } = require('@/lib/database.js');
var { emitSocketToUser, emitSocketToRoom } = require('@/lib/socket.js');
var { loggerInfo } = require('@/lib/logger.js');

var { roundedToFixed, getFormatAmount } = require('@/utils/formatAmount.js');
var { time } = require('@/utils/formatDate.js');
var { calculateLevel } = require('@/utils/utils.js');

var config = require('@/config/config.js');

var histories = {
	'all_bets': [],
	'big_bets': [],
	'game_bets': {}
};

var usersLive = {};

function initializeHistory(){
	loadAllBets();
    loadBigBets();
    loadGameBets();
}

/* ----- INTERNAL USAGE ----- */
function loadAllBets(){
    loggerInfo('[HISTORY] Loading All Bets History');

    pool.query('SELECT * FROM `games_history` WHERE `visible` = 1 ORDER BY `id` DESC LIMIT 10', function(err1, row1) {
		if(err1) {
            loggerInfo('[HISTORY] Error In Loading All Bets History');

            return setTimeout(function(){
                loadAllBets();
            }, 1000);
        }

		row1.reverse();

		row1.forEach(function(item){
			var history = {
				user: {
					userid: item.userid,
					avatar: item.avatar,
					name: item.name,
					level: calculateLevel(parseInt(item.xp)).level
				},
				game: item.game,
				amount: getFormatAmount(item.amount),
				multiplier: roundedToFixed(item.multiplier, 2),
				winning: getFormatAmount(item.winning),
				time: parseInt(item.time)
			}

			histories['all_bets'].push(history);
		});
    });
}

/* ----- INTERNAL USAGE ----- */
function loadBigBets(){
    loggerInfo('[HISTORY] Loading Big Bets History');

    pool.query('SELECT * FROM `games_history` WHERE `visible` = 1 AND `winning` >= ' + config.games.history.big_bets + ' ORDER BY `id` DESC LIMIT 10', function(err1, row1) {
        if(err1) {
            loggerInfo('[HISTORY] Error In Loading Big Bets History');

            return setTimeout(function(){
                loadBigBets();
            }, 1000);
        }

        row1.reverse();

        row1.forEach(function(item){
            var history = {
                user: {
                    userid: item.userid,
                    avatar: item.avatar,
                    name: item.name,
                    level: calculateLevel(parseInt(item.xp)).level
                },
                game: item.game,
                amount: getFormatAmount(item.amount),
                multiplier: roundedToFixed(item.multiplier, 2),
                winning: getFormatAmount(item.winning),
                time: parseInt(item.time)
            }

            histories['big_bets'].push(history);
        });
    });
}

/* ----- INTERNAL USAGE ----- */
function loadGameBets(){
    loggerInfo('[HISTORY] Loading Game Bets History');

    pool.query('SELECT * FROM `games_history` AS `main` WHERE (SELECT COUNT(*) FROM `games_history` AS `sub` WHERE sub.visible = 1 AND sub.game = main.game AND sub.id >= main.id) <= 10 AND `visible` = 1 ORDER BY `id` DESC', function(err1, row1) {
        if(err1) {
            loggerInfo('[HISTORY] Error In Loading Game Bets History');

            return loadGameBets();
        }

        row1.reverse();

        row1.forEach(function(item){
            var history = {
                user: {
                    userid: item.userid,
                    avatar: item.avatar,
                    name: item.name,
                    level: calculateLevel(parseInt(item.xp)).level
                },
                game: item.game,
                amount: getFormatAmount(item.amount),
                multiplier: roundedToFixed(item.multiplier, 2),
                winning: getFormatAmount(item.winning),
                time: parseInt(item.time)
            }

            if(histories['game_bets'][item.game] === undefined) histories['game_bets'][item.game] = [];
            histories['game_bets'][item.game].push(history);
        });
    });
}

function registerHistory(userid, game, gameid, amount, winning, multiplier, visible, countdown, callback){
	pool.query('SELECT `userid`, `name`, `avatar`, `xp` FROM `users` WHERE `userid` = ' + pool.escape(userid), function(err1, row1) {
		if(err1) return callback(new Error('An error occurred while registering history (1)'));

		if(row1.length <= 0) return callback(new Error('Unknown user!'));

		var time_history = time();

		pool.query('INSERT INTO `games_history` SET `visible` = ' + (visible ? 1 : 0) + ', `userid` = ' + pool.escape(row1[0].userid) + ', `name` = ' + pool.escape(row1[0].name) + ', `avatar` = ' + pool.escape(row1[0].avatar) + ', `xp` = ' + parseInt(row1[0].xp) + ', `game` = ' + pool.escape(game) + ', `amount` = ' + amount + ', `winning` = ' + winning + ', `multiplier` = ' + multiplier + ', `gameid` = ' + parseInt(gameid) + ', `time` = ' + pool.escape(time_history), function(err2){
			if(err2) return callback(new Error('An error occurred while registering history (2)'));

			var history = {
				user: {
					userid: row1[0].userid,
					avatar: row1[0].avatar,
					name: row1[0].name,
					level: calculateLevel(row1[0].xp).level
				},
				game: game,
				amount: amount,
				multiplier: multiplier,
				winning: winning,
				time: time_history
			}

			if(usersLive[row1[0].userid] !== undefined){
				var last_type = usersLive[row1[0].userid].split('history_')[1].split('_').slice(0, -1).join('_');

				if(last_type == 'my_bets') {
					setTimeout(function(){
                        if(usersLive[row1[0].userid] !== undefined){
                            var in_type1 = usersLive[row1[0].userid].split('_').slice(0, -1).join('_');

                            emitSocketToRoom(row1[0].userid, 'history', 'history', {
                                history: {
                                    type: 'my_bets',
                                    game, history
                                }
                            });

                            emitSocketToRoom(in_type1, 'history', 'history', {
                                history: {
                                    type: 'my_bets',
                                    game, history
                                }
                            });
                        }
					}, countdown);
				}
			}

			if(!visible) return callback(null);

			Object.keys(histories).forEach(function(type){
				var allowed = true;
				if(type == 'big_bets' && winning < config.games.history.big_bets) allowed = false;

				if(allowed){
					if(type == 'game_bets'){
						if(histories[type][game] === undefined) histories[type][game] = [];

						histories[type][game].push(history);
						if(histories[type][game].length > 10) histories[type][game].shift();
					} else {
						histories[type].push(history);
						if(histories[type].length > 10) histories[type].shift();
					}

					var in_type1 = 'history_' + type;
					if(type == 'game_bets') in_type1 += '_' + game;

					setTimeout(function(){
						emitSocketToRoom(in_type1, 'history', 'history', {
							history: {
								type, game, history
							}
						});

						if(type == 'game_bets') {
							var in_type2 = 'history_' + type;

							emitSocketToRoom(in_type2, 'history', 'history', {
								history: {
									type, game, history
								}
							});
						}
					}, countdown);
				}
			});

			callback(null);
		});
	});
}

function getHistory(user, socket, history, game, cooldown){
	cooldown(true, true);

	var allowed_histories = [ 'all_bets', 'big_bets', 'game_bets', 'my_bets' ];
	if(!allowed_histories.includes(history)){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid history type!'
		});

		return cooldown(false, true);
	}

    //[ 'home' ]
	var pages_allowed = [ ...Object.keys(config.settings.games.games.original), ...Object.keys(config.settings.games.games.classic), ...[ '' ] ];
	if(!pages_allowed.includes(game)){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid history page!'
		});

		return cooldown(false, true);
	}

    //[ 'home' ]
	var pages_load_all = [ '' ];
	var all_games = pages_load_all.includes(game);

	var in_type = 'history_' + history;

	if(!all_games){
		if(history == 'game_bets') in_type += '_' + game;
		else if(history == 'my_bets') in_type += '_' + game;
	}

	if(usersLive[user.userid] !== undefined) socket.leave(usersLive[user.userid]);

	socket.join(in_type);
	usersLive[user.userid] = in_type;

	loadHistory(user.userid, history, game, all_games, function(err1, list){
		if(err1) {
			emitSocketToUser(socket, 'message', 'error', {
                message: err1.message
            });

			return cooldown(false, true);
		}

		emitSocketToUser(socket, 'history', 'list', {
			list: list
		});

		cooldown(false, false);
	});
}

function getUserHistory(user, socket, history, game){
	var allowed_histories = [ 'all_bets', 'big_bets', 'game_bets', 'my_bets' ];
	if(!allowed_histories.includes(history)) return;

    //[ 'home' ]
	var pages_allowed = [ ...Object.keys(config.settings.games.games.original), ...Object.keys(config.settings.games.games.classic), ...[ '' ] ];
	if(!pages_allowed.includes(game)) return;

    //[ 'home' ]
	var pages_load_all = [ '' ];
	var all_games = pages_load_all.includes(game);

	var in_type = 'history_' + history;

	if(!all_games){
		if(history == 'game_bets') in_type += '_' + game;
		else if(history == 'my_bets') in_type += '_' + game;
	}

	if(usersLive[user.userid] !== undefined) socket.leave(usersLive[user.userid]);

	socket.join(in_type);
	usersLive[user.userid] = in_type;

	loadHistory(user.userid, history, game, all_games, function(err1, list){
		if(err1) {
            return emitSocketToUser(socket, 'message', 'error', {
                message: err1.message
            });
        }

		emitSocketToUser(socket, 'history', 'list', {
			list: list
		});
	});
}

function loadHistory(userid, history, game, all_games, callback){
	if(history == 'game_bets') {
		if(all_games) return callback(null, Object.keys(histories[history]).map(a => histories[history][a]).reduce((acc, arr) => { return [ ...acc, ...arr ] }, []).sort(function(a, b){ return b.time - a.time }).slice(0, 10).reverse());

        return callback(null, histories[history][game] !== undefined ? histories[history][game] : []);
	} else if(history == 'my_bets') {
		var query = '';
		if(!all_games) query = ' AND `game` = ' + pool.escape(game);

		pool.query('SELECT * FROM `games_history` WHERE `userid` = ' + pool.escape(userid) + '' + query + ' ORDER BY `id` DESC LIMIT 10', function(err1, row1) {
			if(err1) return callback(new Error('An error occurred while loading history (1)'));

			var list = [];

			row1.reverse();

			row1.forEach(function(item){
				var history = {
					user: {
						userid: item.userid,
						avatar: item.avatar,
						name: item.name,
						level: calculateLevel(parseInt(item.xp)).level
					},
					game: item.game,
					amount: getFormatAmount(item.amount),
					multiplier: roundedToFixed(item.multiplier, 2),
					winning: getFormatAmount(item.winning)
				}

				list.push(history);
			});

			return callback(null, list);
		});
	} else {
		return callback(null, histories[history]);
	}
}

module.exports = { usersLive, initializeHistory, registerHistory, getHistory, getUserHistory };