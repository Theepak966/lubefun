require('dotenv').config();

console.log("=== app.js START ===");

require('module-alias/register');

global.BASE_DIR = __dirname;

var fs = require('fs');
var http = require('http');
var https = require('https');
var { Server } = require('socket.io');
var sha256 = require('sha256');
var cookie = require('cookie');
var crypto = require('crypto');
var os = require('os');

var config = require('@/config/config.js');

var app = require('@/lib/app.js');

app.get("/", (req, res) => {
    res.send("SERVER IS RUNNING");
  });

var { pool } = require('@/lib/database.js');
var { initializeSocket, emitSocketToUser, emitSocketToAll } = require('@/lib/socket.js');
var { initializeLogs, loggerWarn, loggerFatal, loggerDebug } = require('@/lib/logger.js');
var { usersRequests, usersOnline, usersFlooding } = require('@/lib/globals.js');

var { makeDate, time } = require('@/utils/formatDate.js');
var { roundedToFixed, getFormatAmount } = require('@/utils/formatAmount.js');
var { getUserBySession } = require('@/utils/user.js');
var { haveRankPermission, calculateLevel, parseItemName } = require('@/utils/utils.js');

var chatService = require('@/services/chatService.js');

var rewardsService = require('@/services/rewardsService.js');
var affiliatesService = require('@/services/affiliatesService.js');

var userService = require('@/services/userService.js');
var accountService = require('@/services/accountService.js');
var historyService = require('@/services/historyService.js');
var fairService = require('@/services/fairService.js');
var supportService = require('@/services/supportService.js');

var rainService = require('@/services/rainService.js');

var adminService = require('@/services/adminService.js');
var dashboardService = require('@/services/dashboardService.js');

var crashService = require('@/services/games/crashService.js');
var coinflipService = require('@/services/games/coinflipService.js');
var blackjackService = require('@/services/games/blackjackService.js');
var minesweeperService = require('@/services/games/minesweeperService.js');
var towerService = require('@/services/games/towerService.js');
var casinoService = require('@/services/games/casinoService.js');

var cryptoService = require('@/services/trading/cryptoService.js');

// Validate APP_ENV is production
if (process.env.APP_ENV !== 'production') {
    console.error('[FATAL] APP_ENV must be set to "production". Current value: ' + (process.env.APP_ENV || 'undefined'));
    process.exit(1);
}

process.on('uncaughtException', function (error) {
	loggerFatal(error);
});

var server;

if (config.app.listen_secure) {
    if (!config.app.ssl.cert || !config.app.ssl.key) {
        console.error('[FATAL] SSL is enabled but SSL_CRT_FILE or SSL_KEY_FILE is missing');
        process.exit(1);
    }
    server = https.createServer({
        cert: fs.readFileSync(config.app.ssl.cert),
        key: fs.readFileSync(config.app.ssl.key)
    }, app);
} else {
    server = http.createServer(app);
}

var io = new Server(server, {
	// We explicitly allow both long-polling and WebSocket so the app works
	// behind reverse proxies (Nginx) and can upgrade connections when possible.
	transports: [ 'polling', 'websocket' ],
	cors: {
		origin: config.app.secure ? config.app.url : '*',
		allowedHeaders: config.app.secure ? ['Access-Control-Allow-Origin'] : [],
		credentials: config.app.secure,
		methods: [ 'GET', 'POST' ]
	}
});

// Validate APP_PORT is set
if (!process.env.APP_PORT) {
    console.error('[FATAL] APP_PORT is required. Please set it in .env');
    process.exit(1);
}

const PORT = Number(process.env.APP_PORT);

if (isNaN(PORT) || PORT <= 0 || PORT > 65535) {
    console.error('[FATAL] APP_PORT must be a valid port number (1-65535)');
    process.exit(1);
}

console.log("=== ABOUT TO LISTEN ===", PORT);

server.listen(PORT, "0.0.0.0", () => {
  console.log("✅ Server listening on port " + PORT);
});

setInterval(function(){
    var heapUsed = process.memoryUsage().heapUsed / 1000000;

    loggerWarn('[SERVER] Memory usage: ' + heapUsed.toFixed(2) + 'MB');
    loggerWarn('[SERVER] CPU load: ' + os.loadavg()[0].toFixed(2) + '%');
}, 1 * 60 * 1000);

initializeLogs();

initializeSocket(io);

chatService.initializeChat();

rainService.initializeGame();

historyService.initializeHistory();

crashService.initializeGame();
coinflipService.loadGames();
// Safe bot system: bot-only flips, clearly labeled, never match real users
if(String(process.env.BOT_ENABLED).toLowerCase() === 'true'){
    coinflipService.startBotSystem();
}
blackjackService.loadGames();
minesweeperService.loadGames();
towerService.loadGames();
casinoService.initializeCasino();

cryptoService.initializeCurrencies();

io.on('connection', function(socket) {
    var user = null;
	var channel = null;
	var paths = [];

    var agent = socket.request.headers['user-agent'];
    var device = crypto.createHash('sha256').update(agent).digest('hex');

    var cookies = cookie.parse(socket.request.headers.cookie || '');
    var { session } = cookies;

	socket.on('join', function(join_data) {
		channel = join_data.channel;
		paths = join_data.paths;

		if(paths.length <= 0) {
			return emitSocketToUser(socket, 'message', 'error', {
				message: 'Your page is now inactive. Please refresh the page!'
			});
		}

		if(!config.app.chat.channels.includes(channel)){
			return emitSocketToUser(socket, 'message', 'error', {
				message: 'Your page is now inactive. Please refresh the page!'
			});
		}

        getUserBySession(session, device, function(err1, data1) {
            if(err1) {
                return emitSocketToUser(socket, 'message', 'error', {
                    message: 'An error occurred while fetching user data (1)'
                });
            }

            pool.query('SELECT * FROM `maintenance` WHERE `removed` = 0', function(err2, row2) {
                if(err2) {
                    return emitSocketToUser(socket, 'message', 'error', {
                        message: 'An error occurred while fetching user data (2)'
                    });
                }

                if(data1){
                    user = {
                        bot: 0,
                        guest: 0,
                        userid: data1.userid,
                        name: data1['anonymous'] == 1 ? '[anonymous]' : data1.name,
                        avatar: data1['anonymous'] == 1 ? 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/fe/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg' : data1.avatar,
                        balance: roundedToFixed(data1.balance, 2),
                        rank: data1.rank,
                        xp: data1.xp,
                        email: data1.email,
                        rollover: roundedToFixed(data1.rollover, 2),
                        binds: {},
                        settings: {
                            'anonymous': data1['anonymous'],
                            'private': data1['private']
                        },
                        restrictions: {
                            play: 0,
                            trade: 0,
                            site: 0,
                            mute: 0
                        },
                        exclusion: data1['exclusion'],
                        authorized: data1['authorized']
                    };
                } else {
                    user = {
                        bot: 0,
                        guest: 1,
                        userid: socket.id,
                        name: 'Guest',
                        avatar: 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/fe/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg',
                        balance: 0,
                        rank: 0,
                        xp: 0,
                        email: null,
                        rollover: 0,
                        binds: {},
                        settings: {
                            'anonymous': 0,
                            'private': 0
                        },
                        restrictions: {},
                        exclusion: 0,
                        authorized: {
                            account: false,
                            admin: false
                        }
                    };
                }

                //USERS ONLINE
                if(usersOnline[channel] === undefined) usersOnline[channel] = {};
                if(usersOnline[channel][user.userid] === undefined) usersOnline[channel][user.userid] = {
                    count: 0,
                    guest: user.guest,
                    paths: paths,
                    user: {
                        userid: user.userid,
                        name: user.name,
                        avatar: user.avatar,
                        level: calculateLevel(user.xp).level,
                        rank: user.rank
                    }
                };

                usersOnline[channel][user.userid].count++;

                //USERS REQUESTS
                if(usersRequests[user.userid] === undefined) usersRequests[user.userid] = {};

                var hrtime = process.hrtime();
                var nanotime = hrtime[0] * 1000000000 + hrtime[1];

                //USERS FLOOD
                if(usersFlooding[user.userid] === undefined) usersFlooding[user.userid] = { time: nanotime, count: 0 };

                //USER ROOM
                socket.join(user.userid);

                //DEVICE ROOM
                socket.join(device);

                var excluded_pages = [
                    'account', 'user', 'admin'
                ];

                //PAGE ROOM
                if(excluded_pages.includes(paths[0])) socket.join(paths[0]);
                else {

                    //PAGE PATHS ROOM
                    socket.join(paths.join('/'));
                }

                if(data1) loggerWarn('[SERVER] User with userid ' + user.userid + ' is connected on page /' + paths.join('/'));
                else loggerWarn('[SERVER] Guest with socketid ' + socket.id + ' is connected on page /' + paths.join('/'));

                //CHAT ROOM
                socket.join('chat_channel_' + channel);
                chatService.usersChannels[socket.id] = channel;

                //GAMES AMOUNTS
                var games_intervalAmounts = {};

                Object.keys(config.settings.games.games.original).forEach(function(item){
                    if(config.app.intervals.amounts[item] !== undefined) games_intervalAmounts[item] = config.app.intervals.amounts[item];
                });

                games_intervalAmounts['tip_player'] = config.app.intervals.amounts['tip_player'];
                games_intervalAmounts['tip_rain'] = config.app.intervals.amounts['tip_rain'];
                games_intervalAmounts['withdraw_crypto'] = config.app.intervals.amounts['withdraw_crypto'];

                //GAMES HOUSE EDGE
                var games_houseEdges = {};
                Object.keys(config.settings.games.games.original).forEach(function(item){
                    if(config.settings.games.games.original[item] && config.settings.games.games.original[item].house_edge){
                        games_houseEdges[item] = config.settings.games.games.original[item].house_edge.value;
                    }
                });

                var maintenance = row2.length > 0 && !haveRankPermission('access_maintenance', user.rank);

                var socket_return = {
                    maintenance: maintenance
                };

                if(!maintenance){
                    socket_return['amounts'] = games_intervalAmounts;
                    socket_return['house_edges'] = games_houseEdges;

                    socket_return['user'] = {
                        userid: user.userid,
                        name: user.name,
                        balances: [
                            { type: 'main', balance: getFormatAmount(user.balance) }
                        ],
                        rank: user.rank,
                        settings: user.settings,
                        level: calculateLevel(user.xp),
                        authorized: user.authorized
                    };

                    socket_return['chat'] = {
                        messages: [ ...(chatService.messages[channel] || []), ...[{
                            type: 'system',
                            message: config.app.chat.greeting.message,
                            time: time()
                        }] ],
                        listignore: (chatService.ignoreList[user.userid] === undefined) ? [] : Object.keys(chatService.ignoreList[user.userid])
                    };

                    socket_return['offers'] = {
                    };

                    var game_enabled = false;

                    if(config.settings.games.games.original[paths[0]] !== undefined) {
                        if(config.settings.games.games.original[paths[0]].enable) game_enabled = true;
                    } else if(config.settings.games.games.classic[paths[0]] !== undefined) {
                        if(config.settings.games.games.classic[paths[0]].enable) game_enabled = true;
                    }

                    if(haveRankPermission('play_disabled', user.rank)) game_enabled = true;

                    if(paths[0] == 'crash' && game_enabled) {
                        socket_return['crash'] = {
                            history: crashService.lastGames,
                            bets: crashService.totalBets.map(a => ({
                                id: a.id,
                                user: a.user,
                                amount: a.amount,
                                cashedout: crashService.userBets[a.user.userid].cashedout,
                                ended: crashService.gameProperties.status == 'ended',
                                at: crashService.userBets[a.user.userid].cashedout ? roundedToFixed(crashService.userBets[a.user.userid].point / 100, 2) : null,
                                profit: crashService.userBets[a.user.userid].cashedout ? getFormatAmount(crashService.userBets[a.user.userid].amount * crashService.userBets[a.user.userid].point / 100 - crashService.userBets[a.user.userid].amount) : null
                            })),
                            fair: {
                                id: crashService.gameProperties.id,
                                public_seed: crashService.gameProperties.public_seed
                            }
                        };
                    }

                    if(paths[0] == 'coinflip' && game_enabled) {
                        socket_return['coinflip'] = {
                            bets: Object.keys(coinflipService.games).map((bet) => ({
                                id: bet,
                                status: coinflipService.games[bet].status,
                                players: coinflipService.games[bet].players,
                                amount: coinflipService.games[bet].amount,
                                isBotFlip: coinflipService.games[bet].isBotFlip === true, // Mark bot flips
                                ...(function() {
                                    var data = {};

                                    data.fair = {
                                        server_seed_hashed: sha256(coinflipService.games[bet].fair.server_seed),
                                        nonce: bet
                                    };

                                    if(coinflipService.games[bet].status == 1) {
                                        data.time = config.games.games.coinflip.timer_wait_start - time() + coinflipService.games[bet].time
                                    } else if(coinflipService.games[bet].status == 2) {
                                        data.fair.block = coinflipService.games[bet].fair.block;
                                    } else if(coinflipService.games[bet].status == 3) {
                                        data.fair.block = coinflipService.games[bet].fair.block;

                                        data.winner = coinflipService.getWinner(bet);
                                    } else if(coinflipService.games[bet].status == 4) {
                                        data.fair.server_seed = coinflipService.games[bet].fair.server_seed;
                                        data.fair.public_seed = coinflipService.games[bet].fair.public_seed;
                                        data.fair.block = coinflipService.games[bet].fair.block;

                                        data.winner = coinflipService.getWinner(bet);
                                    }

                                    return { data };
                                }())
                            }))
                        };
                    }

                    if(paths[0] == 'blackjack' && game_enabled) {
                        socket_return['blackjack'] = {
                            game: blackjackService.getPublicState ? blackjackService.getPublicState(user.userid, false) : {
                                active: blackjackService.games[user.userid] !== undefined
                            }
                        };
                    }

                    if(paths[0] == 'minesweeper' && game_enabled) {
                        socket_return['minesweeper'] = {
                            game: {
                                active: minesweeperService.games[user.userid] !== undefined,
                                total: minesweeperService.games[user.userid] !== undefined ? (minesweeperService.games[user.userid]['route'].length == 0 ? minesweeperService.games[user.userid]['amount'] : getFormatAmount(minesweeperService.games[user.userid]['amount'] * minesweeperService.generateMultipliers(minesweeperService.games[user.userid]['bombs'])[minesweeperService.games[user.userid]['route'].length - 1])) : 0,
                                profit: minesweeperService.games[user.userid] !== undefined ? (minesweeperService.games[user.userid]['route'].length == 0 ? 0 : getFormatAmount(getFormatAmount(minesweeperService.games[user.userid]['amount'] * minesweeperService.generateMultipliers(minesweeperService.games[user.userid]['bombs'])[minesweeperService.games[user.userid]['route'].length - 1]) - minesweeperService.games[user.userid]['amount'])) : 0,
                                route: minesweeperService.games[user.userid] !== undefined ? minesweeperService.games[user.userid]['route'] : [],
                                amount: minesweeperService.games[user.userid] !== undefined ? minesweeperService.games[user.userid]['amount'] : 0,
                                multipliers: minesweeperService.games[user.userid] !== undefined ? minesweeperService.generateMultipliers(minesweeperService.games[user.userid]['bombs']).slice(0, minesweeperService.games[user.userid]['route'].length) : []

                            }
                        };
                    }

                    if(paths[0] == 'tower' && game_enabled) {
                        socket_return['tower'] = {
                            game: {
                                active: towerService.games[user.userid] !== undefined,
                                difficulty: towerService.games[user.userid] !== undefined ? towerService.games[user.userid]['difficulty'] : 'medium',
                                total: towerService.games[user.userid] !== undefined ? (towerService.games[user.userid]['route'].length == 0 ? towerService.games[user.userid]['amount'] : getFormatAmount(towerService.games[user.userid]['amount'] * towerService.generateMultipliers(towerService.games[user.userid]['difficulty'])[towerService.games[user.userid]['route'].length - 1])) : 0,
                                profit: towerService.games[user.userid] !== undefined ? ((towerService.games[user.userid]['route'].length == 0) ? 0 : getFormatAmount(getFormatAmount(towerService.games[user.userid]['amount'] * towerService.generateMultipliers(towerService.games[user.userid]['difficulty'])[towerService.games[user.userid]['route'].length - 1]) - towerService.games[user.userid]['amount'])) : 0,
                                route: towerService.games[user.userid] !== undefined ? towerService.games[user.userid]['route'] : [],
                                amount: towerService.games[user.userid] !== undefined ? towerService.games[user.userid]['amount'] : 0
                            },
                            multipliers: Object.keys(config.games.games.tower.tiles).reduce((acc, cur) => ({ ...acc, [cur]: towerService.generateMultipliers(cur) }), {})
                        };
                    }

                    if(paths[0] == 'casino' && game_enabled) {
                        socket_return['casino'] = {};
                    }

                    if(paths[0] == 'deposit' || paths[0] == 'withdraw') {
                        if(paths[1] == 'crypto') {
                            socket_return['offers']['crypto'] = {
                                amounts: cryptoService.amounts,
                                fees: cryptoService.fees
                            };
                        }

                    }
                }

                //FIRST DATES
                emitSocketToUser(socket, 'site', 'connected', socket_return);

                if(!maintenance){
                    if(paths[0] == 'crash') dCrash(user, socket);

                    dRain(user, socket);

                    rewardsService.getDailyCooldown(user, socket);

                    historyService.getUserHistory(user, socket, join_data.history, paths[0]);

                    //USERS ONLINE
                    emitSocketToAll('site', 'online', {
                        online: config.app.chat.channels.reduce((acc, cur) => ({ ...acc, [cur]: Object.keys(usersOnline[cur] || {}).length }), {})
                    });
                }
            });
        });
	});

	socket.on('request', function(request) {
		if(!user) {
			return emitSocketToUser(socket, 'message', 'error', {
				message: 'Your page is now inactive. Please refresh the page!'
			});
		}

		if(adminService.updating.value){
			return emitSocketToUser(socket, 'message', 'error', {
				message: 'The server settings are updating. Please try again later!'
			});
		}

		var hrtime = process.hrtime();
		var nanotime = hrtime[0] * 1000000000 + hrtime[1];

		if(nanotime - usersFlooding[user.userid].time >= config.app.flood.time) {
            usersFlooding[user.userid].time = nanotime;
            usersFlooding[user.userid].count = 1;
        } else usersFlooding[user.userid].count++;

		if(usersFlooding[user.userid].count >= config.app.flood.count) {
			loggerWarn('[SERVER] User with userid ' + user.userid + ' is disconnected for flooding');

			socket_disconnect(user, socket, channel, device, paths);

            user = null;

            return;
		}

		if(usersRequests[user.userid][[ request.type, request.command ].join('_')] !== undefined){
			loggerWarn(user.name + '(' + user.userid + ') - Duplicated request: ' + JSON.stringify(request));

            return emitSocketToUser(socket, 'message', 'error', {
				message: 'Wait for ending last action!'
			});
		}

		pool.query('SELECT * FROM `maintenance` WHERE `removed` = 0', function(err1, row1) {
			if(err1) {
                return emitSocketToUser(socket, 'message', 'error', {
                    message: 'An error occurred while fetching user data (3)'
                });
            }

            getUserBySession(session, device, function(err2, data2) {
                if(err2) {
                    return emitSocketToUser(socket, 'message', 'error', {
                        message: 'An error occurred while fetching user data (4)'
                    });
                }

				if(row1.length > 0 && !haveRankPermission('access_maintenance', data2 ? data2.rank : 0)){
					return emitSocketToUser(socket, 'message', 'error', {
						message: 'The server is now in maintenance. Please try again later!'
					});
				}

				if(!data2) return userRequest_request(user, socket, request, device, false);

				pool.query('SELECT * FROM `bannedip` WHERE `ip` = ' + pool.escape(socket.client.request.headers['x-forwarded-for'] || socket.request.connection.remoteAddress) + ' AND `removed` = 0', function(err3, row3) {
					if(err3) {
                        return emitSocketToUser(socket, 'message', 'error', {
                            message: 'An error occurred while fetching user data (5)'
                        });
                    }

					if(row3.length > 0 && !haveRankPermission('exclude_ban_ip', data2.rank)){
						return emitSocketToUser(socket, 'message', 'error', {
							message: 'Your IP is banned.'
						});
					}

					pool.query('SELECT `restriction`, `expire` FROM `users_restrictions` WHERE `removed` = 0 AND (`expire` = -1 OR `expire` > ' + pool.escape(time()) + ') AND `userid` = '+ pool.escape(data2.userid), function(err4, row4){
						if(err4) {
                            return emitSocketToUser(socket, 'message', 'error', {
                                message: 'An error occurred while fetching user data (6)'
                            });
                        }

						user = {
							bot: 0,
							guest: 0,
							userid: data2.userid,
							name: data2['anonymous'] == 1 ? '[anonymous]' : data2.name,
							avatar: data2['anonymous'] == 1 ? 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/fe/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg' : data2.avatar,
							balance: roundedToFixed(data2.balance, 2),
							rank: data2.rank,
							xp: data2.xp,
							email: data2.email,
							rollover: roundedToFixed(data2.rollover, 2),
							binds: {},
							settings: {
								'anonymous': data2['anonymous'],
								'private': data2['private']
							},
							restrictions: {
								play: 0,
								trade: 0,
								site: 0,
								mute: 0
							},
							exclusion: data2['exclusion'],
                            authorized: data2['authorized']
						};

						row4.forEach(function(item){
							if(user.restrictions[item.restriction] !== undefined) user.restrictions[item.restriction] = item.expire;
						});

						if((user.restrictions.site >= time() || user.restrictions.site == -1) && !haveRankPermission('exclude_ban_site', user.rank)){
							return emitSocketToUser(socket, 'message', 'error', {
								message: 'You are restricted to use our site. The restriction expires ' + ((user.restrictions.site == -1) ? 'never' : makeDate(new Date(user.restrictions.site * 1000))) + '.'
							});
						}

						pool.query('SELECT `bind`, `bindid` FROM `users_binds` WHERE `userid` = ' + pool.escape(user.userid) + ' AND `removed` = 0', function(err5, row5) {
							if(err5) {
                                return emitSocketToUser(socket, 'message', 'error', {
                                    message: 'An error occurred while fetching user data (7)'
                                });
                            }

                            if(!user) {
                                return emitSocketToUser(socket, 'message', 'error', {
                                    message: 'Your page is now inactive. Please refresh the page!'
                                });
                            }

							row5.forEach(function(bind){
                                if(config.settings.server.binds[bind.bind] !== undefined && config.settings.server.binds[bind.bind]) user.binds[bind.bind] = bind.bindid;
							});

							return userRequest_request(user, socket, request, device, true);
						});
					});
				});
			});
		});
	});

	socket.on('disconnect', function() {
		socket_disconnect(user, socket, channel, device, paths);

        user = null;
	});
});

function socket_disconnect(user, socket, channel, device, paths){
	socket.disconnect();

    if(!user) return;

	//USER ROOM
	socket.leave(user.userid);

    //DEVICE ROOM
    socket.join(device);

	var excluded_pages = [
        'account', 'user', 'admin'
    ];

	//PAGE ROOM
	if(excluded_pages.includes(paths[0])) socket.leave(paths[0]);
	else {

		//PAGE PATHS ROOM
		socket.leave(paths.join('/'));
	}

	//HISTORY ROOM
	if(historyService.usersLive[user.userid] !== undefined) {
		socket.leave(historyService.usersLive[user.userid]);

		delete historyService.usersLive[user.userid];
	}

	//CHAT CHANNEL ROOM
	if(chatService.usersChannels[socket.id] !== undefined) {
		socket.leave(chatService.usersChannels[socket.id]);

		delete chatService.usersChannels[socket.id];
	}

	//USERS ONLINE
	if(usersOnline[channel] !== undefined){
		if(usersOnline[channel][user.userid] !== undefined) {
			usersOnline[channel][user.userid].count--;

			if(usersOnline[channel][user.userid].count <= 0) {
				delete usersOnline[channel][user.userid];
				if(Object.keys(usersOnline[channel]).length <= 0) delete usersOnline[channel];

				emitSocketToAll('site', 'online', {
					online: config.app.chat.channels.reduce((acc, cur) => ({ ...acc, [cur]: Object.keys(usersOnline[cur] || {}).length }), {})
				});
			}
		}
	}
}

function userRequest_cooldown(userid, action, value, games, request){
	if(usersRequests[userid][action] !== undefined) {
        clearTimeout(usersRequests[userid][action]);
        delete usersRequests[userid][action];
    }

    if(value){

        usersRequests[userid][action] = setTimeout(function(){
            clearTimeout(usersRequests[userid][action]);
            delete usersRequests[userid][action];

            if(action == 'coinflip_join') {
                if(coinflipService.secure[request.id] !== undefined && coinflipService.secure[request.id][userid] !== undefined) delete coinflipService.secure[request.id][userid];
            }

            loggerWarn('[SERVER] Old request not finished for Userid: ' + userid + ' | Action: ' + action);
        }, 10 * 1000)
	} else {
        if(games){
        }

        if(action == 'coinflip_join') {
			if(coinflipService.secure[request.id] !== undefined && coinflipService.secure[request.id][userid] !== undefined) delete coinflipService.secure[request.id][userid];
		}

	}
}

function userRequest_request(user, socket, request, device, logged){
    if(!user) {
        return emitSocketToUser(socket, 'message', 'error', {
            message: 'Your page is now inactive. Please refresh the page!'
        });
    }

	if(request) loggerWarn(user.name + '(' + user.userid + ') - New request: ' + JSON.stringify(request));

	function request_cooldown(value, urgent){
		userRequest_cooldown(user.userid, [ request.type, request.command ].join('_'), value, urgent, request);
	}

	//ACCOUNT REQUESTS
	if(request.type == 'account') {
        if(!logged) {
            return emitSocketToUser(socket, 'message', 'error', {
                message: 'Session expired or you are not logged in. Please refresh the page and try again.'
            });
        }

        if(!user.authorized.account && [ 'save_email', 'remove_session', 'remove_sessions', 'enable_email_verification', 'activate_email_verification', 'disable_email_verification', 'enable_authenticator_app', 'activate_authenticator_app', 'disable_authenticator_app', 'manage_authenticator_app', 'generate_codes_authenticator_app', 'twofa_primary_method' ]) {
            return emitSocketToUser(socket, 'message', 'error', {
                message: 'Your identity verification session expired. Please refresh the page!'
            });
        }

        /* REQUESTS FOR USERS */

		if(request.command == 'save_email') return accountService.saveEmail(user, socket, request.email, request.recaptcha, request_cooldown);

		if(request.command == 'tip') return accountService.sendTip(user, socket, request.userid, request.amount, request.recaptcha, request_cooldown);
		if(request.command == 'mute') return accountService.mutePlayer(user, socket, request.userid, request.time, request.reason, request_cooldown);

        if(request.command == 'deposit_bonus') return accountService.applyDepositBonus(user, socket, request.code, request.recaptcha, request_cooldown);
		if(request.command == 'profile_settings') return accountService.saveProfileSettings(user, socket, request.data, request_cooldown);
		if(request.command == 'exclusion') return accountService.setExclusionAccount(user, socket, request.exclusion, request.recaptcha, request_cooldown);
		if(request.command == 'remove_session') return accountService.removeSessionAccount(user, socket, request.session, request_cooldown);
		if(request.command == 'remove_sessions') return accountService.removeAllSessionsAccount(user, socket, request_cooldown);

        if(request.command == 'enable_email_verification') return accountService.enableEmailVerification(user, socket, request_cooldown);
        if(request.command == 'activate_email_verification') return accountService.activateEmailVerification(user, socket, request.code, request_cooldown);
        if(request.command == 'disable_email_verification') return accountService.disableEmailVerification(user, socket, request_cooldown);

        if(request.command == 'enable_authenticator_app') return accountService.enableAuthenticatorApp(user, socket, request_cooldown);
        if(request.command == 'activate_authenticator_app') return accountService.activateAuthenticatorApp(user, socket, request.token, request_cooldown);
        if(request.command == 'disable_authenticator_app') return accountService.disableAuthenticatorApp(user, socket, request_cooldown);
        if(request.command == 'manage_authenticator_app') return accountService.manageAuthenticatorApp(user, socket, request_cooldown);
        if(request.command == 'generate_codes_authenticator_app') return accountService.generateCodesAuthenticatorApp(user, socket, request_cooldown);

        if(request.command == 'twofa_primary_method') return accountService.setTwofaPrimaryMethod(user, socket, request.method, request_cooldown);

        /* END REQUESTS FOR USERS */
    }

	//REWARDS REQUESTS
	if(request.type == 'rewards'){
		if(!logged) {
            return emitSocketToUser(socket, 'message', 'error', {
                message: 'Session expired or you are not logged in. Please refresh the page and try again.'
            });
        }

        /* REQUESTS FOR USERS */

        if(user.exclusion > time()) {
			return emitSocketToUser(socket, 'message', 'error', {
				message: 'Your exclusion expires ' + makeDate(new Date(user.exclusion * 1000)) + '.'
			});
		}

		if(request.command == 'bind') return rewardsService.redeemBindReward(user, socket, request.data, request.recaptcha, request_cooldown);
		if(request.command == 'referral_redeem') return rewardsService.redeemRefferalCode(user, socket, request.data, request.recaptcha, request_cooldown);
		if(request.command == 'referral_create') return rewardsService.createRefferalCode(user, socket, request.data, request.recaptcha, request_cooldown);
		if(request.command == 'bonus_redeem') return rewardsService.redeemBonusCode(user, socket, request.data, request.recaptcha, request_cooldown);
		if(request.command == 'bonus_create') return rewardsService.createBonusCode(user, socket, request.data, request.recaptcha, request_cooldown);
		if(request.command == 'daily_redeem') return rewardsService.redeemDailyReward(user, socket, request.recaptcha, request_cooldown);

        /* END REQUESTS FOR USERS */
	}

	//AFFILIATES REQUESTS
	if(request.type == 'affiliates') {
        if(!logged) {
            return emitSocketToUser(socket, 'message', 'error', {
                message: 'Session expired or you are not logged in. Please refresh the page and try again.'
            });
        }

        /* REQUESTS FOR USERS */

		if(request.command == 'collect') return affiliatesService.collectRewards(user, socket, request.recaptcha, request_cooldown);

        /* END REQUESTS FOR USERS */
	}

	//HISTORY REQUESTS
	if(request.type == 'history') {
        if(!logged) {
            return emitSocketToUser(socket, 'message', 'error', {
                message: 'Session expired or you are not logged in. Please refresh the page and try again.'
            });
        }

        /* REQUESTS FOR GUESTS */

		if(request.command == 'get') return historyService.getHistory(user, socket, request.history, request.game, request_cooldown);

        /* END REQUESTS FOR GUESTS */
	}

	//CHAT REQUESTS
	if(request.type == 'chat') {
        /* REQUESTS FOR GUESTS */

		if(request.command == 'channel') return chatService.loadChannel(user, socket, request.channel, request_cooldown);
		if(request.command == 'commands') return chatService.loadCommands(user, socket, request.message, request_cooldown);

        /* END REQUESTS FOR GUESTS */

        if(!logged) {
            return emitSocketToUser(socket, 'message', 'error', {
                message: 'Session expired or you are not logged in. Please refresh the page and try again.'
            });
        }

        /* REQUESTS FOR USERS */

		if(request.command == 'message') return chatService.checkMessage(user, socket, request.message, request.channel, request.reply, request_cooldown);

        /* END REQUESTS FOR USERS */
	}

	//RAIN REQUESTS
	if(request.type == 'rain') {
        if(!logged) {
            return emitSocketToUser(socket, 'message', 'error', {
                message: 'Session expired or you are not logged in. Please refresh the page and try again.'
            });
        }

        /* REQUESTS FOR USERS */

		if(request.command == 'join') return rainService.joinGame(user, socket, request.recaptcha, request_cooldown);
		if(request.command == 'tip') return rainService.tipGame(user, socket, request.amount, request_cooldown);

        /* END REQUESTS FOR USERS */
	}

	//FAIR REQUESTS
	if(request.type == 'fair') {
        if(!logged) {
            return emitSocketToUser(socket, 'message', 'error', {
                message: 'Session expired or you are not logged in. Please refresh the page and try again.'
            });
        }

        /* REQUESTS FOR USERS */

		if(request.command == 'save_clientseed') return fairService.changeClientSeed(user, socket, request.seed, request.recaptcha, request_cooldown);
		if(request.command == 'regenerate_serverseed') return fairService.regenerateServerSeed(user, socket, request.recaptcha, request_cooldown);

        /* END REQUESTS FOR USERS */
	}

	//SUPPORT REQUESTS
	if(request.type == 'support') {
        if(!logged) {
            return emitSocketToUser(socket, 'message', 'error', {
                message: 'Session expired or you are not logged in. Please refresh the page and try again.'
            });
        }

        /* REQUESTS FOR USERS */

		if(request.command == 'create') return supportService.createRequest(user, socket, request.subject, request.department, request.message, request_cooldown);
		if(request.command == 'reply') return supportService.replyRequest(user, socket, request.id, request.message, request_cooldown);
		if(request.command == 'close') return supportService.closeRequest(user, socket, request.id, request_cooldown);

        /* END REQUESTS FOR USERS */
	}

    //GAME BOTS REQUESTS
	if(request.type == 'gamebots') {
        if(!logged) {
            return emitSocketToUser(socket, 'message', 'error', {
                message: 'Session expired or you are not logged in. Please refresh the page and try again.'
            });
        }

        /* REQUESTS FOR USERS */

		if(request.command == 'confirm') return adminService.confirmGameBot(user, socket, request.userid, request.game, request.data, request_cooldown);

        /* END REQUESTS FOR USERS */
	}

	//DASHBOARD REQUESTS
	if(request.type == 'dashboard') {
        if(!logged) {
            return emitSocketToUser(socket, 'message', 'error', {
                message: 'Session expired or you are not logged in. Please refresh the page and try again.'
            });
        }

        if(!user.authorized.admin) {
            return emitSocketToUser(socket, 'message', 'error', {
                message: 'Your identity verification session expired. Please refresh the page!'
            });
        }

        /* REQUESTS FOR USERS */

		if(request.command == 'graph') return dashboardService.getGraph(user, socket, request.graph, request_cooldown);
		if(request.command == 'graphs') return dashboardService.getAllGraphs(user, socket, request.graphs, request_cooldown);
		if(request.command == 'stats') return dashboardService.getAllStats(user, socket, request.stats, request_cooldown);

        /* END REQUESTS FOR USERS */
	}

	//ADMIN REQUESTS
	if(request.type == 'admin') {

        if(!logged) {
            return emitSocketToUser(socket, 'message', 'error', {
                message: 'Session expired or you are not logged in. Please refresh the page and try again.'
            });
        }

        if(!user.authorized.admin) {
            return emitSocketToUser(socket, 'message', 'error', {
                message: 'Your identity verification session expired. Please refresh the page!'
            });
        }

        /* REQUESTS FOR USERS */

		if(request.command == 'maintenance') return adminService.setMaintenance(user, socket, request.status, request.reason, request.secret, request_cooldown);
		if(request.command == 'settings') return adminService.setSettings(user, socket, request.settings, request.status, request.secret, request_cooldown);
		if(request.command == 'remove_bind') return adminService.removeUserBind(user, socket, request.userid, request.bind, request.secret, request_cooldown);
		if(request.command == 'remove_exclusion') return adminService.removeUserExclusion(user, socket, request.userid, request.secret, request_cooldown);
		if(request.command == 'remove_sessions') return adminService.removeUserSessions(user, socket, request.userid, request.secret, request_cooldown);
		if(request.command == 'ban_ip') return adminService.banUserIp(user, socket, request.userid, request.ip, request.secret, request_cooldown);
		if(request.command == 'unban_ip') return adminService.unbanUserIp(user, socket, request.userid, request.ip, request.secret, request_cooldown);
		if(request.command == 'set_rank') return adminService.setUserRank(user, socket, request.userid, request.rank, request.secret, request_cooldown);
		if(request.command == 'edit_balance') return adminService.editUserBalance(user, socket, request.userid, request.amount, request.secret, request_cooldown);
		if(request.command == 'set_restriction') return adminService.setUserRestriction(user, socket, request.userid, request.restriction, request.time, request.reason, request.secret, request_cooldown);
		if(request.command == 'unset_restriction') return adminService.unsetUserRestriction(user, socket, request.userid, request.restriction, request.secret, request_cooldown);
		if(request.command == 'tracking_links_create') return adminService.createTrackingLink(user, socket, request.expire, request.usage, request.secret, request_cooldown);
		if(request.command == 'tracking_links_remove') return adminService.removeTrackingLink(user, socket, request.id, request.secret, request_cooldown);

		if(request.command == 'deposit_bonuses_create') return adminService.createDepositBonus(user, socket, request.referral, request.code, request.secret, request_cooldown);
		if(request.command == 'deposit_bonuses_remove') return adminService.removeDepositBonus(user, socket, request.id, request.secret, request_cooldown);

        if(request.command == 'games_house_edges') return adminService.setGamesHouseEdges(user, socket, request.house_edges, request.secret, request_cooldown);

        if(request.command == 'payment_confirm') return adminService.confirmWithdrawListing(user, socket, request.method, request.trade, request.secret, request_cooldown);
		if(request.command == 'payment_cancel') return adminService.cancelWithdrawListing(user, socket, request.method, request.trade, request.secret, request_cooldown);

		if(request.command == 'payments_manually_amount') return adminService.setManuallyWithdrawAmount(user, socket, request.amount, request.secret, request_cooldown);

		if(request.command == 'admin_access_set') return adminService.setAdminAccess(user, socket, request.userid, request.secret, request_cooldown);
		if(request.command == 'admin_access_unset') return adminService.unsetAdminAccess(user, socket, request.userid, request.secret, request_cooldown);

        if(request.command == 'gamebots_create') return adminService.createGameBot(user, socket, request.name, request.secret, request_cooldown);

        if(request.command == 'support_claim') return adminService.claimSupportRequest(user, socket, request.id, request.secret, request_cooldown);
        if(request.command == 'support_release') return adminService.releaseSupportRequest(user, socket, request.id, request.secret, request_cooldown);
        if(request.command == 'support_change_department') return adminService.changeDepartmentSupportRequest(user, socket, request.id, request.department, request.secret, request_cooldown);
        if(request.command == 'support_reply') return adminService.replySupportRequest(user, socket, request.id, request.message, request.secret, request_cooldown);
        if(request.command == 'support_close') return adminService.closeSupportRequest(user, socket, request.id, request.secret, request_cooldown);

        /* END REQUESTS FOR USERS */
    }

	//PAGINATION REQUESTS
	if(request.type == 'pagination') {

        /* REQUESTS FOR GUESTS */

        if(request.command == 'affiliates_referrals') return userService.getAffiliatesReferrals(user, socket, request.page, request_cooldown);

        if(request.command == 'casino_slots_games') return casinoService.getSlotsGames(user, socket, request.page, request.order, request.provider, request.search, request_cooldown);
        if(request.command == 'casino_live_games') return casinoService.getLiveGames(user, socket, request.page, request.order, request.provider, request.search, request_cooldown);
        if(request.command == 'casino_favorites_games') return casinoService.getFavoritesGames(user, socket, request.page, request.order, request.provider, request.search, request_cooldown);
        if(request.command == 'casino_all_games') return casinoService.getAllGames(user, socket, request.page, request.search, request_cooldown);

		/* END REQUESTS FOR GUESTS */

        if(!logged) {
            return emitSocketToUser(socket, 'message', 'error', {
                message: 'Session expired or you are not logged in. Please refresh the page and try again.'
            });
        }

        if(!user.authorized.admin && [ 'admin_users', 'admin_crypto_confirmations', 'admin_tracking_links', 'admin_deposit_bonuses', 'admin_gamebots', 'admin_support_requests' ].includes(request.command)) {
            return emitSocketToUser(socket, 'message', 'error', {
                message: 'Your identity verification session expired. Please refresh the page!'
            });
        }

        /* REQUESTS FOR USERS */

        if(request.command == 'admin_users') return adminService.getUsers(user, socket, request.page, request.order, request.search, request_cooldown);
        if(request.command == 'admin_crypto_confirmations') return adminService.getCryptoWithdrawListings(user, socket, request.page, request_cooldown);
		if(request.command == 'admin_tracking_links') return adminService.getTrackingLinks(user, socket, request.page, request.search, request_cooldown);
        if(request.command == 'admin_deposit_bonuses') return adminService.getDepositBonuses(user, socket, request.page, request.search, request_cooldown);
        if(request.command == 'admin_gamebots') return adminService.getGameBots(user, socket, request.page, request.order, request.search, request_cooldown);
        if(request.command == 'admin_support_requests') return adminService.getSupportRequests(user, socket, request.page, request.status, request.department, request.search, request_cooldown);

		if(request.command == 'account_transactions') return accountService.getAccountTransactions(user, socket, request.page, request_cooldown);
        if(request.command == 'account_deposits') return accountService.getAccountDeposits(user, socket, request.page, request_cooldown);
        if(request.command == 'account_withdrawals') return accountService.getAccountWithdrawals(user, socket, request.page, request_cooldown);
        if(request.command == 'account_crash_history') return accountService.getAccountCrashHistory(user, socket, request.page, request_cooldown);
        if(request.command == 'account_coinflip_history') return accountService.getAccountCoinflipHistory(user, socket, request.page, request_cooldown);
        if(request.command == 'account_blackjack_history') return accountService.getAccountBlackjackHistory(user, socket, request.page, request_cooldown);
        if(request.command == 'account_tower_history') return accountService.getAccountTowerHistory(user, socket, request.page, request_cooldown);
        if(request.command == 'account_minesweeper_history') return accountService.getAccountMinesweeperHistory(user, socket, request.page, request_cooldown);
        if(request.command == 'account_casino_history') return accountService.getAccountCasinoHistory(user, socket, request.page, request_cooldown);

        if(request.command == 'user_transactions') return userService.getUserTransactions(user, socket, request.page, request.userid, request_cooldown);
        if(request.command == 'user_deposits') return userService.getUserDeposits(user, socket, request.page, request.userid, request_cooldown);
        if(request.command == 'user_withdrawals') return userService.getUserWithdrawals(user, socket, request.page, request.userid, request_cooldown);
        if(request.command == 'user_crash_history') return userService.getUserCrashHistory(user, socket, request.page, request.userid, request_cooldown);
        if(request.command == 'user_coinflip_history') return userService.getUserCoinflipHistory(user, socket, request.page, request.userid, request_cooldown);
        if(request.command == 'user_blackjack_history') return userService.getUserBlackjackHistory(user, socket, request.page, request.userid, request_cooldown);
        if(request.command == 'user_tower_history') return userService.getUserTowerHistory(user, socket, request.page, request.userid, request_cooldown);
        if(request.command == 'user_minesweeper_history') return userService.getUserMinesweeperHistory(user, socket, request.page, request.userid, request_cooldown);
        if(request.command == 'user_casino_history') return userService.getUserCasinoHistory(user, socket, request.page, request.userid, request_cooldown);

        if(request.command == 'support_requests') return supportService.getSupportRequests(user, socket, request.page, request.status, request.search, request_cooldown);

        /* END REQUESTS FOR USERS */
    }

	//ORIGINAL GAMES REQUESTS
	if(config.settings.games.games.original[request.type] !== undefined){
		if(!config.settings.games.games.original[request.type].enable && !haveRankPermission('play_disabled', user.rank)){
			return emitSocketToUser(socket, 'message', 'error', {
				message: 'This game is offline. Please try again later!'
			});
		}

        /* REQUESTS FOR GUESTS */

        /* END REQUESTS FOR GUESTS */

		if(!logged) {
            emitSocketToUser(socket, 'message', 'error', {
                message: 'Session expired or you are not logged in. Please refresh the page and try again.'
            });

            return emitSocketToUser(socket, 'modal', 'auth');
        }

        /* REQUESTS FOR USERS */

        if(!config.settings.games.status && !haveRankPermission('play_offline', user.rank)){
			return emitSocketToUser(socket, 'message', 'error', {
				message: 'The server bets is now offline. Please try again later!'
			});
		}

		if((user.restrictions.play >= time() || user.restrictions.play == -1) && !haveRankPermission('exclude_ban_play', user.rank)){
			return emitSocketToUser(socket, 'message', 'error', {
				message: 'You are restricted to use our games. The restriction expires ' + ((user.restrictions.play == -1) ? 'never' : makeDate(new Date(user.restrictions.play * 1000))) + '.'
			});
		}

		if(user.exclusion > time()) {
			return emitSocketToUser(socket, 'message', 'error', {
				message: 'Your exclusion expires ' + makeDate(new Date(user.exclusion * 1000)) + '.'
			});
		}

        if(request.type == 'crash') {
			if(request.command == 'bet') return crashService.placeBet(user, socket, request.amount, request.auto, request_cooldown);
			if(request.command == 'cashout') return crashService.cashoutBet(user, socket, request_cooldown);
		}

        if(request.type == 'coinflip') {
			if(request.command == 'create') return coinflipService.createGame(user, socket, request.amount, request.position, request_cooldown);
			if(request.command == 'join') return coinflipService.joinGame(user, socket, request.id, request_cooldown);
		}

        if(request.type == 'blackjack') {
            if(request.command == 'bet') return blackjackService.placeBet(user, socket, request.amount, request_cooldown);
            if(request.command == 'hit') return blackjackService.hit(user, socket, request_cooldown);
            if(request.command == 'stand') return blackjackService.stand(user, socket, request_cooldown);
        }

        if(request.type == 'minesweeper') {
			if(request.command == 'bet') return minesweeperService.placeBet(user, socket, request.amount, request.bombs, request_cooldown);
			if(request.command == 'cashout') return minesweeperService.cashoutBet(user, socket, request_cooldown);
			if(request.command == 'bomb') return minesweeperService.checkBomb(user, socket, request.bomb, request_cooldown);
		}

        if(request.type == 'tower') {
			if(request.command == 'bet') return towerService.placeBet(user, socket, request.amount, request.difficulty, request_cooldown);
			if(request.command == 'cashout') return towerService.cashoutBet(user, socket, request_cooldown);
			if(request.command == 'stage') return towerService.checkStage(user, socket, request.stage, request.button, request_cooldown);
		}

        /* END REQUESTS FOR USERS */
	}

    //CLASSIC GAMES REQUESTS
	if(config.settings.games.games.classic[request.type] !== undefined){
        if(!config.settings.games.games.classic[request.type].enable && !haveRankPermission('play_disabled', user.rank)){
			return emitSocketToUser(socket, 'message', 'error', {
				message: 'This game is offline. Please try again later!'
			});
		}

        /* REQUESTS FOR GUESTS */


        /* END REQUESTS FOR GUESTS */

		if(!logged) {
            emitSocketToUser(socket, 'message', 'error', {
                message: 'Session expired or you are not logged in. Please refresh the page and try again.'
            });

            return emitSocketToUser(socket, 'modal', 'auth');
        }

        /* REQUESTS FOR USERS */

        if(!config.settings.games.status && !haveRankPermission('play_offline', user.rank)){
			return emitSocketToUser(socket, 'message', 'error', {
				message: 'The server bets is now offline. Please try again later!'
			});
		}

		if((user.restrictions.play >= time() || user.restrictions.play == -1) && !haveRankPermission('exclude_ban_play', user.rank)){
			return emitSocketToUser(socket, 'message', 'error', {
				message: 'You are restricted to use our games. The restriction expires ' + ((user.restrictions.play == -1) ? 'never' : makeDate(new Date(user.restrictions.play * 1000))) + '.'
			});
		}

		if(user.exclusion > time()) {
			return emitSocketToUser(socket, 'message', 'error', {
				message: 'Your exclusion expires ' + makeDate(new Date(user.exclusion * 1000)) + '.'
			});
		}

        if(request.type == 'casino') {
			if(request.command == 'set_favorite') return casinoService.setFavoriteGame(user, socket, request.id, request_cooldown);
			if(request.command == 'unset_favorite') return casinoService.unsetFavoriteGame(user, socket, request.id, request_cooldown);

            if(request.command == 'launch_real') return casinoService.getLaunchGameReal(user, socket, request.id, request_cooldown);
		}

        /* END REQUESTS FOR USERS */
    }

    //CRYPTO PAYMENTS REQUESTS
    if(request.type == 'crypto') {
        var deposit_requests = [ 'deposit' ];
        var withdraw_requests = [ 'withdraw' ];

        if(deposit_requests.includes(request.command) && (config.settings.payments.methods.crypto[request.currency] === undefined || (!config.settings.payments.methods.crypto[request.currency].enable.deposit && !haveRankPermission('trade_disabled', user.rank)))){
            return emitSocketToUser(socket, 'message', 'error', {
                message: 'This Crypto deposit method is offline. Please try again later!'
            });
        }

        if(withdraw_requests.includes(request.command) && (config.settings.payments.methods.crypto[request.currency] === undefined || (!config.settings.payments.methods.crypto[request.currency].enable.withdraw && !haveRankPermission('trade_disabled', user.rank)))){
            return emitSocketToUser(socket, 'message', 'error', {
                message: 'This Crypto withdraw method is offline. Please try again later!'
            });
        }

        if(!logged) {
            emitSocketToUser(socket, 'message', 'error', {
                message: 'Session expired or you are not logged in. Please refresh the page and try again.'
            });

            return emitSocketToUser(socket, 'modal', 'auth');
        }

        if(!config.settings.payments.status && !haveRankPermission('trade_offline', user.rank)){
			return emitSocketToUser(socket, 'message', 'error', {
				message: 'The server trades is now offline. Try again later!'
			});
		}

        if(cryptoService.updating.value){
            return emitSocketToUser(socket, 'message', 'error', {
                message: 'The crypto currencies prices are updating. Please try again later!'
            });
        }

        /* REQUESTS FOR USERS */

        if(request.command == 'deposit') return cryptoService.placeDeposit(user, socket, request.currency, request.value, request_cooldown);
        if(request.command == 'withdraw') return cryptoService.placeWithdraw(user, socket, request.currency, request.amount, request.address, request.recaptcha, request_cooldown);

        /* END REQUESTS FOR USERS */
    }

	emitSocketToUser(socket, 'message', 'error', {
		message: 'This is a invalid request! Please refresh the page.'
	});
}

function dRain(user, socket){
	if(rainService.gameProperties.status == 'waiting') {
		emitSocketToUser(socket, 'rain', 'waiting', {
			last: rainService.lastGame.value,
			amount: rainService.gameProperties.amount
		});
	} else if(rainService.gameProperties.status == 'started'){
		emitSocketToUser(socket, 'rain', 'started', {
			time: config.app.rain.cooldown_start + rainService.gameProperties.roll - time(),
			cooldown: config.app.rain.cooldown_start,
			amount: rainService.gameProperties.amount,
			joined: rainService.userBets[user.userid] !== undefined && rainService.userBets[user.userid] >= 1
		});
	} else {
		emitSocketToUser(socket, 'rain', 'started', {
			time: 0,
			cooldown: config.app.rain.cooldown_start,
			amount: rainService.gameProperties.amount,
			joined: rainService.userBets[user.userid] !== undefined && rainService.userBets[user.userid] >= 1
		});
	}
}

function dCrash(user, socket){
	if(crashService.gameProperties.status == 'started'){
		emitSocketToUser(socket, 'crash', 'starting', {
			time: (crashService.gameSettings.start_time > 0) ? Math.floor(config.games.games.crash.timer * 1000 - new Date().getTime() + crashService.gameSettings.start_time) : Math.floor(config.games.games.crash.timer * 1000),
			total: (crashService.userBets[user.userid] !== undefined) ? crashService.userBets[user.userid]['amount'] : 0,
			profit: 0
		});
	} else if(crashService.gameProperties.status == 'counting'){
		emitSocketToUser(socket, 'crash', 'started', {
			difference: new Date().getTime() - crashService.gameSettings.progress_time
		});

		if(crashService.userBets[user.userid] !== undefined){
			if(crashService.userBets[user.userid]['cashedout'] == true){
				var winning = getFormatAmount(crashService.userBets[user.userid]['amount'] * crashService.userBets[user.userid]['point'] / 100);

				emitSocketToUser(socket, 'crash', 'cashed_out', {
					total: winning,
					profit: getFormatAmount(winning - crashService.userBets[user.userid]['amount'])
				});
			}
		}
	} else if(crashService.gameProperties.status == 'ended'){
		var winners = [];
		for(var bet of crashService.totalBets) {
			if(crashService.userBets[bet.user.userid]['cashedout']) {
				winners.push(bet.user);
			}
		}

		if(crashService.userBets[user.userid] !== undefined){
			if(crashService.userBets[user.userid]['cashedout'] == true){
				var winning = getFormatAmount(crashService.userBets[user.userid]['amount'] * crashService.userBets[user.userid]['point'] / 100);

				emitSocketToUser(socket, 'crash', 'cashed_out', {
					total: winning,
					profit: getFormatAmount(winning - crashService.userBets[user.userid]['amount'])
				});
			}
		}

		emitSocketToUser(socket, 'crash', 'crashed', {
			number: crashService.gameProperties.roll,
			time: crashService.gameSettings.end_time,
			loaded: true,
			winners: winners.map(a => a.userid)
		});

		if(crashService.userBets[user.userid] !== undefined){
			if(crashService.userBets[user.userid]['cashedout'] == true){
				var winning = getFormatAmount(crashService.userBets[user.userid]['amount'] * crashService.userBets[user.userid]['point'] / 100);

				emitSocketToUser(socket, 'crash', 'cashed_out', {
					amount: winning,
					loaded: true
				});
			}
		}
	}
}
