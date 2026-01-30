var request = require('request');

var { pool } = require('@/lib/database.js');
var { emitSocketToUser } = require('@/lib/socket.js');
var { loggerTrace, loggerDebug, loggerInfo, loggerError } = require('@/lib/logger.js');

var { time } = require('@/utils/formatDate.js');
var { haveRankPermission, isJsonString, getSlug } = require('@/utils/utils.js');
var { getFormatAmount, getFormatAmountString, verifyFormatAmount } = require('@/utils/formatAmount.js');

var userService = require('@/services/userService.js');

var config = require('@/config/config.js');

var token = null;

var updating = {
	value: true
};

var providers = {};
var providerids = {};

var games = {};
var gameids = {};

var stats = {};
var favorites = {};

var providersMapping = {
    'iconix': 'Iconix International',
    'pateplay': 'Pateplay',
    'pateplay-live': 'Pateplay',
    'iconic21': 'Iconic21',
    'iconic21-slots': 'Iconic21',
    'elagames-a': 'ELA Games',
    'vivo': 'Vivo Gaming',
    'nolimitcity-A': 'Nolimit City',
    'nolimitcityWC': 'Nolimit City',
    'macaw': 'Macaw Gaming',
    'booming': 'Booming Games',
    'fancyshoes': 'Fancy Shoes Studio',
    'bigpot': 'Bigpot Gaming',
    'airdice': 'Air Dice',
    'armadillostudios': 'Armadillo Studios',
    'betsoft-a': 'Betsoft',
    'onegame': 'OneGame',
    '1x2gaming': '1X2gaming',
    'bigtimegaming-a': 'Big Time Gaming',
    'prospectgaming': 'Prospect Gaming',
    'jvl': 'JVL',
    'irondogPP': 'Iron Dog Studio',
    'irondogP': 'Iron Dog Studio',
    'irondog': 'Iron Dog Studio',
    'only-play': 'Onlyplay',
    'espressogames-a': 'Espresso Games',
    'sagaming': 'SA Gaming',
    'egtdigital': 'EGT Digital',
    'fazi': 'Fazi',
    'redstone': 'Red Stone Gaming',
    'tiptop': 'Tiptop Games',
    'amigogaming': 'Amigo Gaming',
    'tada': 'TaDa Gaming',
    'apparat': 'Apparat Gaming',
    'barbara-bang': 'Barbara Bang',
    'kagaming': 'KA Gaming',
    'netgame': 'NetGame',
    'netgameP': 'NetGame',
    'bitville': 'Bitville Gaming',
    'bgaming': 'BGaming',
    'bgamingP': 'BGaming',
    'rubyplay': 'RubyPlay',
    'spribe': 'Spribe',
    'yggdrasil-a': 'Yggdrasil',
    'yoloplay-a': 'Yoloplay',
    'evoplay': 'Evoplay',
    'slotopia': 'Slotopia',
    'creedz-vgs': 'CreedRoomz',
    'creedz': 'CreedRoomz',
    'creedz-bj': 'CreedRoomz',
    'creedroomz-b': 'CreedRoomz',
    'creedroomz': 'CreedRoomz',
    'creedroomzP': 'CreedRoomz',
    'amusnet': 'Amusnet Interactive',
    'amusnet-live': 'Amusnet Interactive',
    'livegames': 'LiveGames',
    'habanero': 'Habanero',
    'pragmatic': 'Pragmatic Play',
    'pragmatic-live': 'Pragmatic Play',
    'pragmatic-bj': 'Pragmatic Play',
    'pragmatic-bj2': 'Pragmatic Play',
    'pragmatic-virtual': 'Pragmatic Play',
    'pragmaticS': 'Pragmatic Play',
    'endorphina': 'Endorphina',
    'skywind': 'Skywind Group',
    'skywind-live': 'Skywind Group',
    'skywind-bj': 'Skywind Group',
    'caletagaming': 'Caleta Gaming',
    'absolute': 'Absolute',
    '7-mojos': '7Mojos',
    '7mojos': '7Mojos',
    '7-mojos-slots': '7Mojos',
    '7mojos-slots': '7Mojos',
    'altente': 'Altente',
    'religa': 'Religa',
    'wazdan-a': 'Wazdan',
    'bfgames': 'BF Games',
    'hacksaw': 'Hacksaw Gaming',
    'backseat': 'Backseat Gaming',
    'bullshark': 'Bullshark Games',
    'popok': 'PopOK Gaming',
    'popok-live': 'PopOK Gaming',
    'platipus': 'Platipus',
    'mancala': 'Mancala Gaming',
    'retrogames': 'Retro Gaming',
    'spinomenal': 'Spinomenal',
    'fils': 'Fils Game',
    'liw': 'Liw Games',
    'tvbet': 'TVBet',
    'smartsoft': 'SmartSoft Gaming',
    'onetouch': 'OneTouch',
    'onetouch-live': 'OneTouch',
    'onetouch-bj': 'OneTouch',
    'spearhead': 'Spearhead Studios',
    'spearheadP': 'Spearhead Studios',
    'pgsoft': 'PG Soft',
    'platingaming': 'Platin Gaming',
    '7777': '7777 Gaming',
    'micro-gaming': 'Microgaming',
    'micro-gaming-live': 'Microgaming',
    'gamzix': 'Gamzix',
    'redrake': 'Red Rake Gaming',
    'galaxsys': 'Galaxsys',
    'galaxsysP': 'Galaxsys',
    'ctinteractive': 'CT Interactive',
    '3oaks': '3 Oaks Gaming',
    '3oaksP': '3 Oaks Gaming',
    'novo-matic': 'Novomatic',
    'play-son': 'Playson',
    'play-sonP': 'Playson',
    'turbo-games': 'Turbo Games',
    'evolutionWC': 'Evolution',
    'evolutionWCX': 'Evolution',
    'evolutionWCY': 'Evolution',
    'evolutionWCHS': 'Evolution',
    'evolutionWCLS': 'Evolution',
    'netentWC': 'NetEnt',
    'netentEZp': 'NetEnt',
    'netentEZ': 'NetEnt',
    'redtigerWC': 'Red Tiger',
    'redtigerEZ': 'Red Tiger',
    'redtigerEZp': 'Red Tiger',
    'imagine live': 'Imagine Live',
    'imagineliveLS': 'Imagine Live',
    'formulaspin': 'Formula Spin',
    'popiplay': 'Popiplay',
    'dreamplay': 'Dream Play',
    'pixmove-games': 'Pixmove Games',
    '100hp': '100HP Gaming',
    'adlunam': 'AdLunam',
    'aviator': 'Aviator',
    'aviatrix': 'Aviator',
    'goldenrace': 'GoldenRace',
    'jetx': 'JetX',
    'vision': 'Vision',
    'visionP': 'Vision',
    'vision-b': 'Vision',
    'ftv': 'FashionTV',
    'ftv-b': 'FashionTV',
    'ftvP': 'FashionTV',
    'eclipse': 'Eclipse',
    'eclipse-b': 'Eclipse',
    'eclipseP': 'Eclipse'
};

function initializeCasino(){
    generateToken(function(err1){
        if(err1) return;

        loggerDebug('[CASINO] Casino Authenticated');

        updating.value = true;

        initializeGames(function(err2){
            if(err2) return;

            updating.value = false;

            loadGamesStats();
            loadFavoritesGames();
        });

        setInterval(function(){
            generateToken(function(err2){
                if(err2) return;

                loggerDebug('[CASINO] Casino Reauthenticated');
            });
        }, config.games.games.casino.access_token.cooldown_load * 1000);

        setInterval(function(){
            updating.value = true;

            initializeGames(function(err2){
                if(err2) return;

                updating.value = false;

                loadGamesStats();
            });
        }, config.games.games.casino.games.cooldown_load * 1000);
    });
}

function initializeGames(callback){
    loadProviders(function(err1){
        if(err1) return callback(err1);

        loggerDebug('[CASINO] Providers Loaded');

        loadGames(function(err2){
            if(err2) return callback(err2);

            loggerDebug('[CASINO] Games Loaded');

            callback(null);
        });
    });
}

/* ----- INTERNAL USAGE ----- */
function loadGamesStats(){
    loggerDebug('[CASINO] Loading Games Stats');

    pool.query('SELECT casino_bets.game AS `id`, COUNT(*) AS `games`, SUM(casino_bets.amount) AS `bets`, SUM(casino_winnings.amount) AS `winnings` FROM `casino_bets` LEFT JOIN `casino_winnings` ON casino_bets.id = casino_winnings.betid GROUP BY casino_bets.game', function(err1, row1) {
        if(err1) {
            loggerInfo('[CASINO] Error In Loading Games Stats');

            return setTimeout(function(){
                loadGamesStats();
            }, 1000);
        }

        stats = {
            ...stats,
            ...row1.filter(a => games[a.id] !== undefined).reduce((acc, cur) => ({ ...acc, [cur.id]: {
                id: cur.id,
                games: parseInt(cur.games),
                bets: getFormatAmount(cur.bets),
                winnings: getFormatAmount(cur.winnings)
            } }), {})
        };
    });
}

/* ----- INTERNAL USAGE ----- */
function loadFavoritesGames(){
    loggerDebug('[CASINO] Loading Favorites Games');

    pool.query('SELECT `userid`, `game` FROM `casino_favorites` WHERE `removed` = 0', function(err1, row1) {
        if(err1) {
            loggerInfo('[CASINO] Error In Loading Favorites Games');

            return setTimeout(function(){
                loadFavoritesGames();
            }, 1000);
        }

        if(row1.length <= 0) return;

        favorites = row1.filter(a => games[a.game] !== undefined).reduce(function(acc, cur) {
            if(!acc[cur.userid]) acc[cur.userid] = [];

            acc[cur.userid].push(cur.game);

            return acc;
        }, {});
    });
}

/* ----- INTERNAL USAGE ----- */
function generateToken(callback){
	var options = {
		'method': 'POST',
		'url': 'https://gator.drakon.casino/api/v1/auth/authentication',
		'headers': {
			'Authorization': 'Bearer ' + Buffer.from(config.games.games.casino.drakon.agent.token + ':' + config.games.games.casino.drakon.agent.secret_key).toString('base64'),
			'User-Agent': 'PostmanRuntime/7.39.1'
		}
	};

    request(options, function(err1, response1, body1) {
		if(err1) {
            loggerError(err1);

            return callback(new Error('An error occurred while generating token (1)'));
        }

        if(!response1 || response1.statusCode != 200) return callback(new Error('An error occurred while generating token (2)'));
		if(!isJsonString(body1)) return callback(new Error('An error occurred while generating token (2)'));

        var body = JSON.parse(body1);

        token = body.access_token;

        callback(null);
	});
}

/* ----- INTERNAL USAGE ----- */
function loadProviders(callback){
    var options = {
		'method': 'GET',
		'url': 'https://gator.drakon.casino/api/v1/games/provider',
		'headers': {
			'Authorization': 'Bearer ' + token,
			'User-Agent': 'PostmanRuntime/7.39.1'
		}
	};

    request(options, function(err1, response1, body1) {
		if(err1) {
            loggerError(err1);

            return callback(new Error('An error occurred while loading providers (1)'));
        }

        if(!response1 || response1.statusCode != 200) return callback(new Error('An error occurred while loading providers (2)'));
		if(!isJsonString(body1)) return callback(new Error('An error occurred while loading providers (3)'));

        var body = JSON.parse(body1);

        var providersNew = [];
        var provideridsNew = [];

        body.providers.forEach(function(item){
            if(providersMapping[item.code] === undefined) {
                loggerError('[CASINO] Provider ' + item.code + ' in not included and must be included manually');
            } else {
                var id = getSlug(providersMapping[item.code]);

                providers[id] = {
                    id: id,
                    name: providersMapping[item.code],
                    status: item.status == 1,
                    rtp: item.rtp
                };

                providerids[item.code] = id;

                providersNew.push(id);
                provideridsNew.push(item.code);
            }
        });

        Object.keys(providers).filter(a => !providersNew.some(b => b == a)).forEach(function(id){
            delete providers[id];
        });

        Object.keys(providerids).filter(a => !provideridsNew.some(b => b == a)).forEach(function(id){
            delete providerids[id];
        });

        callback(null);
    });
}

/* ----- INTERNAL USAGE ----- */
function loadGames(callback){
	var options = {
		'method': 'GET',
		'url': 'https://gator.drakon.casino/api/v1/games/all',
		'headers': {
			'Authorization': 'Bearer ' + token,
			'User-Agent': 'PostmanRuntime/7.39.1'
		}
	};

    request(options, function(err1, response1, body1) {
		if(err1) {
            loggerError(err1);

            return callback(new Error('An error occurred while loading games (1)'));
        }

        if(!response1 || response1.statusCode != 200) return callback(new Error('An error occurred while loading games (2)'));
		if(!isJsonString(body1)) return callback(new Error('An error occurred while loading games (3)'));

        var body = JSON.parse(body1);

        var allowedTypes = {
            'andarbahar': 'live',
            'baccarat': 'live',
            'blackjack': 'live',
            'dragontiger': 'live',
            'gameshow': 'live',
            'lobby': 'live',
            'lottery': 'live',
            'poker': 'live',
            'roulette': 'live',
            'slot': 'slots',
            'slots': 'slots',
            'tablegames': 'live'

            //'bingo': 'live',
            //'dice': 'live',
            //'cards': 'live',
            //'crashgame': 'live',
            //'instantgame': 'live',
            //'sicbo': 'live',
            //'keno': 'live',
            //'interactivegame': 'live',
            //'scratchcards': 'live',
            //'virtual': 'live',
            //'shooting': 'live',
            //'lotto': 'live',
            //'other': 'live',
            //'betonnumbers': 'live',
            //'topcard': 'live',
            //'casual': 'live',
            //'plinko': 'live'
        };

        var real = [
            'air_dice',
            'amigo_gaming',
            'amusnet_interactive',
            'bgaming',
            'endorphina',
            'fils_game',
            'ka_gaming',
            'onegame',
            'retro_gaming',
            'spinomenal'
        ];

        var gamesNew = [];
        var gameidsNew = [];

        body.games.filter(a => Object.keys(allowedTypes).includes(a.game_type)).forEach(function(item){
            if(providerids[item.provider_game] !== undefined) {
                var id = getSlug(providers[providerids[item.provider_game]].id + ' ' + item.game_name);

                games[id] = {
                    id: id,
                    type: allowedTypes[item.game_type],
                    status: item.status == 1,
                    demo: item.only_demo == 1 && !real.includes(providers[providerids[item.provider_game]].id),
                    mobile: item.is_mobile == 1,
                    game: {
                        id: item.game_id,
                        name: item.game_name,
                        image: item.banner
                    },
                    provider: {
                        id: providers[providerids[item.provider_game]].id,
                        name: providers[providerids[item.provider_game]].name
                    },
                    rtp: item.rtp
                };

                gameids[item.game_id] = id;

                stats[id] = {
                    id: id,
                    games: 0,
                    bets: 0,
                    winnings: 0
                };

                gamesNew.push(id);
                gameidsNew.push(item.game_id);
            } else if(providersMapping[item.provider_game] !== undefined) {
                var id = getSlug(providersMapping[item.provider_game] + ' ' + item.game_name);

                games[id] = {
                    id: id,
                    type: allowedTypes[item.game_type],
                    status: item.status == 1,
                    demo: item.only_demo == 1 && !real.includes(getSlug(providersMapping[item.provider_game])),
                    mobile: item.is_mobile == 1,
                    game: {
                        id: item.game_id,
                        name: item.game_name,
                        image: item.banner
                    },
                    provider: {
                        id: getSlug(providersMapping[item.provider_game]),
                        name: providersMapping[item.provider_game]
                    },
                    rtp: item.rtp
                };

                gameids[item.game_id] = id;

                stats[id] = {
                    id: id,
                    games: 0,
                    bets: 0,
                    winnings: 0
                };

                gamesNew.push(id);
                gameidsNew.push(item.game_id);
            } else loggerError('[CASINO] Provider ' + item.provider_game + ' in not included and must be included manually');
        });

        Object.keys(games).filter(a => !gamesNew.some(b => b == a)).forEach(function(id){
            delete games[id];
            delete stats[id];
        });

        Object.keys(gameids).filter(a => !gameidsNew.some(b => b == a)).forEach(function(id){
            delete gameids[id];
        });

        callback(null);
	});
}

/* ----- INTERNAL USAGE ----- */
function getLaunchUrl(userid, name, id, demo, callback){
    var mobile = 0;

	var options = {
		'method': 'GET',
		'url': 'https://gator.drakon.casino/api/v1/games/game_launch',
		'headers': {
			'Authorization': 'Bearer ' + token,
			'User-Agent': 'PostmanRuntime/7.39.1'
		},
		qs: {
            'agent_code': config.games.games.casino.drakon.agent.code,
            'agent_token': config.games.games.casino.drakon.agent.token,
			'game_id': games[id].game.id,
			'user_id': userid,
			'user_name': name,
			'type': demo ? 'TRY' : 'CHARGED',
			'mode': demo ? 'fun' : 'real',
			'device': mobile ? 'mobile' : 'desktop',
			'currency': config.games.games.casino.drakon.agent.currency,
			'lang': config.games.games.casino.drakon.language
        }
	};

    request(options, function(err1, response1, body1) {
		if(err1) {
            loggerError(err1);

            return callback(new Error('An error occurred while getting launch url (1)'));
        }

        if(!response1 || response1.statusCode != 200) return callback(new Error('An error occurred while getting launch url (2)'));
		if(!isJsonString(body1)) return callback(new Error('An error occurred while getting launch url (3)'));

        var body = JSON.parse(body1);

        callback(null, body.game_url);
	});
}

/* ----- CLIENT USAGE ----- */
function setFavoriteGame(user, socket, id, cooldown){
    cooldown(true, true);

    if(games[id] === undefined) {
        emitSocketToUser(socket, 'message', 'error', {
            message: 'Invalid gameid!'
        });

        return cooldown(false, true);
    }

    pool.query('SELECT * FROM `casino_favorites` WHERE `userid` = ' + pool.escape(user.userid) + ' AND `game` = ' + pool.escape(id) + ' AND `removed` = 0', function(err1, row1) {
        if(err1) {
            emitSocketToUser(socket, 'message', 'error', {
                message: 'An error occurred while setting favorite game (1)'
            });

            return cooldown(false, true);
        }

        if(row1.length > 0){
            emitSocketToUser(socket, 'message', 'error', {
                message: 'This game is already on your favorite games!'
            });

            return cooldown(false, true);
        }

        pool.query('INSERT INTO `casino_favorites` SET `userid` = ' + pool.escape(user.userid) + ', `game` = ' + pool.escape(id) + ', `time` = ' + pool.escape(time()), function(err2, row2) {
            if(err2) {
                emitSocketToUser(socket, 'message', 'error', {
                    message: 'An error occurred while setting favorite game (2)'
                });

                return cooldown(false, true);
            }

            if(favorites[user.userid] === undefined) favorites[user.userid] = [];
            favorites[user.userid].push(id);

            emitSocketToUser(socket, 'casino', 'add_favorite', { id });

            cooldown(false, false);
        });
    });
}

/* ----- CLIENT USAGE ----- */
function unsetFavoriteGame(user, socket, id, cooldown){
    cooldown(true, true);

    if(games[id] === undefined) {
        emitSocketToUser(socket, 'message', 'error', {
            message: 'Invalid gameid!'
        });

        return cooldown(false, true);
    }

    pool.query('SELECT * FROM `casino_favorites` WHERE `userid` = ' + pool.escape(user.userid) + ' AND `game` = ' + pool.escape(id) + ' AND `removed` = 0', function(err1, row1) {
        if(err1) {
            emitSocketToUser(socket, 'message', 'error', {
                message: 'An error occurred while unsetting favorite game (1)'
            });

            return cooldown(false, true);
        }

        if(row1.length <= 0){
            emitSocketToUser(socket, 'message', 'error', {
                message: 'This game is not on your favorite games!'
            });

            return cooldown(false, true);
        }

        pool.query('UPDATE `casino_favorites` SET `removed` = 1 WHERE `userid` = ' + pool.escape(user.userid) + ' AND  `game` = ' + pool.escape(id) + ' AND `removed` = 0', function(err2, row2) {
            if(err2) {
                emitSocketToUser(socket, 'message', 'error', {
                    message: 'An error occurred while unsetting favorite game (2)'
                });

                return cooldown(false, true);
            }

            if(favorites[user.userid] !== undefined){
                var index = favorites[user.userid].findIndex(a => a == id);

                if(index >= 0) favorites[user.userid].splice(index, 1);

                if(favorites[user.userid].length <= 0) delete favorites[user.userid];
            }

            emitSocketToUser(socket, 'casino', 'remove_favorite', { id });

            cooldown(false, false);
        });
    });
}

/* ----- CLIENT USAGE ----- */
function getSlotsGames(user, socket, page, order, provider, search, cooldown){
    cooldown(true, true);

    var order_allowed = [ 0, 1, 2, 3 ];
	if(!order_allowed.includes(order)){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid order!'
		});

		return cooldown(false, true);
	}

    var provider_allowed = [ ...[ 'all' ], ...Object.values(games).map(a => a.provider.id).filter((value, index, array) => array.indexOf(value) === index) ];
	if(!provider_allowed.includes(provider)){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid provider!'
		});

		return cooldown(false, true);
	}

    if(isNaN(Number(page))){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid page!'
		});

		return cooldown(false, true);
	}

	page = parseInt(page);
	search = search.trim();

    var listitems = Object.values(games).filter(a => a.type == 'slots').map(a => ({
        id: a.id,
        name: a.game.name,
        provider: a.provider.id,
        games: stats[a.id].games,
        winnings: stats[a.id].winnings
    }));

    var providersNames = Object.values(listitems.map(a => games[a.id].provider).reduce((acc, cur) => ({ ...acc, [cur.id]: cur }), {})).sort((a, b) => a.name.localeCompare(b.name));

    listitems = listitems.filter(a => a.name.toLowerCase().indexOf(search.toLowerCase()) >= 0);

    if(provider != 'all') listitems = listitems.filter(a => a.provider == provider);

    var pages = Math.ceil(listitems.length / 100);

    if(pages <= 0){
        emitSocketToUser(socket, 'pagination', 'casino_slots_games', {
            list: [],
            providers: [],
            pages: 1,
            page: 1
        });

        return cooldown(false, false);
    }

    if(page <= 0 || page > pages) {
        emitSocketToUser(socket, 'message', 'error', {
            message: 'Invalid page!'
        });

        return cooldown(false, true);
    }

    if(order == 0) listitems.sort((a, b) => b.games - a.games );
    else if(order == 1) listitems.sort((a, b) => b.winnings - a.winnings );
    else if(order == 2) listitems.sort((a, b) => a.name.localeCompare(b.name));
    else if(order == 3) listitems.sort((a, b) => b.name.localeCompare(a.name));

    var result = listitems.slice((page - 1) * 100, page * 100);

    var list = result.map(a => ({
        id: a.id,
        enable: providers[games[a.id].provider.id] !== undefined ? games[a.id].status && providers[games[a.id].provider.id].status : false,
        name: games[a.id].game.name,
        image: games[a.id].game.image,
        provider: games[a.id].provider.name,
        rtp: games[a.id].rtp,
        demo: games[a.id].demo,
        favorite: favorites[user.userid] !== undefined ? favorites[user.userid].some(b => b == a.id) : false
    }));

    emitSocketToUser(socket, 'pagination', 'casino_slots_games', {
        list: list,
        providers: providersNames,
        pages: pages,
        page: page
    });

    cooldown(false, false);
}

/* ----- CLIENT USAGE ----- */
function getLiveGames(user, socket, page, order, provider, search, cooldown){
    cooldown(true, true);

    var order_allowed = [ 0, 1, 2, 3 ];
	if(!order_allowed.includes(order)){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid order!'
		});

		return cooldown(false, true);
	}

    var provider_allowed = [ ...[ 'all' ], ...Object.values(games).map(a => a.provider.id).filter((value, index, array) => array.indexOf(value) === index) ];
	if(!provider_allowed.includes(provider)){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid provider!'
		});

		return cooldown(false, true);
	}

    if(isNaN(Number(page))){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid page!'
		});

		return cooldown(false, true);
	}

	page = parseInt(page);
	search = search.trim();

    var listitems = Object.values(games).filter(a => a.type == 'live').map(a => ({
        id: a.id,
        name: a.game.name,
        provider: a.provider.id,
        games: stats[a.id].games,
        winnings: stats[a.id].winnings
    }));

    var providersNames = Object.values(listitems.map(a => games[a.id].provider).reduce((acc, cur) => ({ ...acc, [cur.id]: cur }), {})).sort((a, b) => a.name.localeCompare(b.name));

    listitems = listitems.filter(a => a.name.toLowerCase().indexOf(search.toLowerCase()) >= 0);

    if(provider != 'all') listitems = listitems.filter(a => a.provider == provider);

    var pages = Math.ceil(listitems.length / 100);

    if(pages <= 0){
        emitSocketToUser(socket, 'pagination', 'casino_live_games', {
            list: [],
            providers: [],
            pages: 1,
            page: 1
        });

        return cooldown(false, false);
    }

    if(page <= 0 || page > pages) {
        emitSocketToUser(socket, 'message', 'error', {
            message: 'Invalid page!'
        });

        return cooldown(false, true);
    }

    if(order == 0) listitems.sort((a, b) => b.games - a.games );
    else if(order == 1) listitems.sort((a, b) => b.winnings - a.winnings );
    else if(order == 2) listitems.sort((a, b) => a.name.localeCompare(b.name));
    else if(order == 3) listitems.sort((a, b) => b.name.localeCompare(a.name));

    var result = listitems.slice((page - 1) * 100, page * 100);

    var list = result.map(a => ({
        id: a.id,
        enable: providers[games[a.id].provider.id] !== undefined ? games[a.id].status && providers[games[a.id].provider.id].status : false,
        name: games[a.id].game.name,
        image: games[a.id].game.image,
        provider: games[a.id].provider.name,
        rtp: games[a.id].rtp,
        demo: games[a.id].demo,
        favorite: favorites[user.userid] !== undefined ? favorites[user.userid].some(b => b == a.id) : false
    }));

    emitSocketToUser(socket, 'pagination', 'casino_live_games', {
        list: list,
        providers: providersNames,
        pages: pages,
        page: page
    });

    cooldown(false, false);
}

/* ----- CLIENT USAGE ----- */
function getFavoritesGames(user, socket, page, order, provider, search, cooldown){
    cooldown(true, true);

    var order_allowed = [ 0, 1, 2, 3 ];
	if(!order_allowed.includes(order)){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid order!'
		});

		return cooldown(false, true);
	}

    var provider_allowed = [ ...[ 'all' ], ...Object.values(games).map(a => a.provider.id).filter((value, index, array) => array.indexOf(value) === index) ];
	if(!provider_allowed.includes(provider)){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid provider!'
		});

		return cooldown(false, true);
	}

    if(isNaN(Number(page))){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid page!'
		});

		return cooldown(false, true);
	}

	page = parseInt(page);
	search = search.trim();

    var listitems = Object.values(games).map(a => ({
        id: a.id,
        name: a.game.name,
        provider: a.provider.id,
        games: stats[a.id].games,
        winnings: stats[a.id].winnings
    }));

    var providersNames = Object.values(listitems.map(a => games[a.id].provider).reduce((acc, cur) => ({ ...acc, [cur.id]: cur }), {})).sort((a, b) => a.name.localeCompare(b.name));

    listitems = listitems.filter(a => a.name.toLowerCase().indexOf(search.toLowerCase()) >= 0);

    if(provider != 'all') listitems = listitems.filter(a => a.provider == provider);

    listitems = favorites[user.userid] !== undefined ? listitems.filter(a => favorites[user.userid].some(b => b == a.id)) : [];

    var pages = Math.ceil(listitems.length / 100);

    if(pages <= 0){
        emitSocketToUser(socket, 'pagination', 'casino_favorites_games', {
            list: [],
            providers: [],
            pages: 1,
            page: 1
        });

        return cooldown(false, false);
    }

    if(page <= 0 || page > pages) {
        emitSocketToUser(socket, 'message', 'error', {
            message: 'Invalid page!'
        });

        return cooldown(false, true);
    }

    if(order == 0) listitems.sort((a, b) => b.games - a.games );
    else if(order == 1) listitems.sort((a, b) => b.winnings - a.winnings );
    else if(order == 2) listitems.sort((a, b) => a.name.localeCompare(b.name));
    else if(order == 3) listitems.sort((a, b) => b.name.localeCompare(a.name));

    var result = listitems.slice((page - 1) * 100, page * 100);

    var list = result.map(a => ({
        id: a.id,
        enable: providers[games[a.id].provider.id] !== undefined ? games[a.id].status && providers[games[a.id].provider.id].status : false,
        name: games[a.id].game.name,
        image: games[a.id].game.image,
        provider: games[a.id].provider.name,
        rtp: games[a.id].rtp,
        demo: games[a.id].demo,
        favorite: true
    }));

    emitSocketToUser(socket, 'pagination', 'casino_favorites_games', {
        list: list,
        providers: providersNames,
        pages: pages,
        page: page
    });

    cooldown(false, false);
}

/* ----- CLIENT USAGE ----- */
function getAllGames(user, socket, page, search, cooldown){
    cooldown(true, true);

    if(isNaN(Number(page))){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid page!'
		});

		return cooldown(false, true);
	}

	page = parseInt(page);
	search = search.trim();

    var listitems = Object.values(games).map(a => ({
        id: a.id,
        name: a.game.name,
        provider: a.provider.id,
        games: stats[a.id].games,
        winnings: stats[a.id].winnings
    }));

    listitems = listitems.filter(a => a.name.toLowerCase().indexOf(search.toLowerCase()) >= 0);

    var pages = Math.ceil(listitems.length / 100);

    if(pages <= 0){
        emitSocketToUser(socket, 'pagination', 'casino_all_games', {
            list: [],
            pages: 1,
            page: 1
        });

        return cooldown(false, false);
    }

    if(page <= 0 || page > pages) {
        emitSocketToUser(socket, 'message', 'error', {
            message: 'Invalid page!'
        });

        return cooldown(false, true);
    }

    listitems.sort((a, b) => b.games - a.games );

    var result = listitems.slice((page - 1) * 100, page * 100);

    var list = result.map(a => ({
        id: a.id,
        enable: providers[games[a.id].provider.id] !== undefined ? games[a.id].status && providers[games[a.id].provider.id].status : false,
        name: games[a.id].game.name,
        image: games[a.id].game.image,
        provider: games[a.id].provider.name,
        rtp: games[a.id].rtp,
        demo: games[a.id].demo,
        favorite: favorites[user.userid] !== undefined ? favorites[user.userid].some(b => b == a.id) : false
    }));

    emitSocketToUser(socket, 'pagination', 'casino_all_games', {
        list: list,
        pages: pages,
        page: page
    });

    cooldown(false, false);
}

/* ----- CLIENT USAGE ----- */
function getLaunchGameDemo(user, socket, id, cooldown){
    cooldown(true, true);

    if(games[id] === undefined) {
        emitSocketToUser(socket, 'message', 'error', {
            message: 'Invalid gameid!'
        });

        return cooldown(false, true);
    }

    if(!games[id].status) {
        emitSocketToUser(socket, 'message', 'error', {
            message: 'This game is disabled!'
        });

        return cooldown(false, true);
    }

    if(!games[id].demo) {
        emitSocketToUser(socket, 'message', 'error', {
			message: 'This game is not available in demo mode!'
		});

		return cooldown(false, true);
    }

    getLaunchUrl(0, 'Guest', id, true, function(err1, url){
        if(err1) {
            emitSocketToUser(socket, 'message', 'error', {
                message: err1.message
            });

            return cooldown(false, true);
        }

        emitSocketToUser(socket, 'casino', 'launch', {
            id: id,
            game: games[id].game.name,
            provider: games[id].provider.name,
            url: url,
            favorite: favorites[user.userid] !== undefined ? favorites[user.userid].some(a => a == id) : false,
            demo: true
        });

        cooldown(false, false);
    });
}

/* ----- CLIENT USAGE ----- */
function getLaunchGameReal(user, socket, id, cooldown){
    cooldown(true, true);

    if(games[id] === undefined) {
        emitSocketToUser(socket, 'message', 'error', {
            message: 'Invalid gameid!'
        });

        return cooldown(false, true);
    }

    if(!games[id].status) {
        emitSocketToUser(socket, 'message', 'error', {
            message: 'This game is disabled!'
        });

        return cooldown(false, true);
    }

    if(!config.settings.games.casino.real && !haveRankPermission('play_casino_real', user.rank)){
        emitSocketToUser(socket, 'message', 'error', {
            message: 'Real mode temporary disabled!'
        });

        return cooldown(false, true);
    }

    pool.query('SELECT `id` FROM `users` WHERE `userid` = ' + pool.escape(user.userid), function(err1, row1) {
        if(err1) {
            emitSocketToUser(socket, 'message', 'error', {
                message: 'An error occurred while getting launch game real (1)'
            });

            return cooldown(false, true);
        }

        if(row1.length <= 0){
            emitSocketToUser(socket, 'message', 'error', {
                message: 'Unknown user!'
            });

            return cooldown(false, true);
        }

        getLaunchUrl(row1[0].id, user.name, id, false, function(err2, url){
            if(err2) {
                emitSocketToUser(socket, 'message', 'error', {
                    message: err2.message
                });

                return cooldown(false, true);
            }

            emitSocketToUser(socket, 'casino', 'launch', {
                id: id,
                game: games[id].game.name,
                provider: games[id].provider.name,
                url: url,
                favorite: favorites[user.userid] !== undefined ? favorites[user.userid].some(a => a == id) : false,
                demo: false
            });

            cooldown(false, false);
        });
    });
}

function getKnownGamesList(userid){
    var gameids = [
        'pragmatic_play_gates_of_olympus',
        'pragmatic_play_sweet_bonanza',
        'hacksaw_gaming_wanted_dead_or_a_wild',
        'egt_digital_40_burning_hot_clover_chance',
        'pragmatic_play_the_dog_house',
        'hacksaw_gaming_rip_city',
        'pragmatic_play_fruit_party',
        'egt_digital_shining_crown_clover_chance',
        'pragmatic_play_sugar_rush',
        'hacksaw_gaming_le_bandit',
        'pragmatic_play_big_bass_bonanza',
        'pragmatic_play_starlight_princess',
        'egt_digital_flaming_hot_extreme_clover_chance',
        'hacksaw_gaming_chaos_crew',
        'bgaming_aztec_clusters',
        'hacksaw_gaming_le_pharaoh',
        'pragmatic_play_madame_destiny',
        'pragmatic_play_chicken_drop',
        'hacksaw_gaming_sixsixsix',
        'pragmatic_play_gems_bonanza',
        'nolimit_city_mental',
        'egt_digital_40_super_hot_clover_chance',
        'nolimit_city_fire_in_the_hole_xbomb',
        'pragmatic_play_release_the_kraken',
        'hacksaw_gaming_cubes',
        'pragmatic_play_great_rhino_megaways',
        'hacksaw_gaming_duel_at_dawn',
        'egt_digital_vampire_night_clover_chance',
        'hacksaw_gaming_pray_for_three',
        'nolimit_city_duck_hunters'
    ];

    return gameids.filter(a => games[a] !== undefined).map(a => ({
        id: a,
        enable: providers[games[a].provider.id] !== undefined ? games[a].status && providers[games[a].provider.id].status : false,
        name: games[a].game.name,
        image: games[a].game.image,
        provider: games[a].provider.name,
        rtp: games[a].rtp,
        demo: games[a].demo,
        favorite: userid ? favorites[userid] !== undefined ? favorites[userid].some(b => b == a) : false : false
    }));
}

function getHotGamesList(userid){
    return Object.values(stats).sort((a, b) => b.games - a.games ).slice(0, 20).map(a => ({
        id: a.id,
        enable: providers[games[a.id].provider.id] !== undefined ? games[a.id].status && providers[games[a.id].provider.id].status : false,
        name: games[a.id].game.name,
        image: games[a.id].game.image,
        provider: games[a.id].provider.name,
        rtp: games[a.id].rtp,
        demo: games[a.id].demo,
        favorite: userid ? favorites[userid] !== undefined ? favorites[userid].some(b => b == a.id) : false : false
    }));
}

function getSlotsGamesList(userid){
    return Object.values(stats).sort((a, b) => b.games - a.games ).filter(a => games[a.id].type == 'slots').slice(0, 20).map(a => ({
        id: a.id,
        enable: providers[games[a.id].provider.id] !== undefined ? games[a.id].status && providers[games[a.id].provider.id].status : false,
        name: games[a.id].game.name,
        image: games[a.id].game.image,
        provider: games[a.id].provider.name,
        rtp: games[a.id].rtp,
        demo: games[a.id].demo,
        favorite: userid ? favorites[userid] !== undefined ? favorites[userid].some(b => b == a.id) : false : false
    }));
}

function getLiveGamesList(userid){
    return Object.values(stats).sort((a, b) => b.games - a.games ).filter(a => games[a.id].type == 'live').slice(0, 20).map(a => ({
        id: a.id,
        enable: providers[games[a.id].provider.id] !== undefined ? games[a.id].status && providers[games[a.id].provider.id].status : false,
        name: games[a.id].game.name,
        image: games[a.id].game.image,
        provider: games[a.id].provider.name,
        rtp: games[a.id].rtp,
        demo: games[a.id].demo,
        favorite: userid ? favorites[userid] !== undefined ? favorites[userid].some(b => b == a.id) : false : false
    }));
}

/* ----- API USAGE ----- */
function getUserDetails(id, callback){
    pool.query('SELECT `email`, `name` FROM `users` WHERE `id` = ' + pool.escape(id), function(err1, row1) {
        if(err1) return callback('INVALID_USER');

        if(row1.length <= 0) return callback('INVALID_USER');

        return callback(null, {
            email: row1[0].email,
            player_name: row1[0].name,
            date: new Date().toISOString()
        });
    });
}

/* ----- API USAGE ----- */
function getUserBalance(id, callback){
    pool.query('SELECT `balance` FROM `users` WHERE `id` = ' + pool.escape(id), function(err1, row1) {
        if(err1) return callback('INVALID_USER');

        if(row1.length <= 0) return callback('INVALID_USER');

        return callback(null, getFormatAmount(row1[0].balance));
    });
}

/* ----- API USAGE ----- */
function placeBet(id, amount, transactionid, roundid, game, callback){
    if(gameids[game] === undefined) return callback('INVALID_USER');

    pool.query('SELECT `userid`, `name`, `avatar`, `xp` FROM `users` WHERE `id` = ' + pool.escape(id), function(err1, row1) {
        if(err1) return callback('INVALID_USER');

        if(row1.length <= 0) return callback('INVALID_USER');

        pool.query('SELECT * FROM `casino_bets` WHERE `roundid` = ' + pool.escape(roundid), function(err2, row2) {
            if(err2) return callback('INVALID_USER');

            if(row2.length > 0) return callback('DOUBLED_BET');

            amount = getFormatAmount(amount);

            //CHECK BALANCE
            userService.getBalance(row1[0].userid, function(err3, balance){
                if(err3) return callback('INVALID_USER');

                if(balance < amount) return callback('NO_BALANCE');

                //REGISTER BET
                userService.registerClassicBet(row1[0].userid, amount, 'casino', function(err4, newxp, newbalance){
                    if(err4) return callback('INVALID_USER');

                    pool.query('INSERT INTO `casino_bets` SET `userid` = ' + pool.escape(row1[0].userid) + ', `name` = ' + pool.escape(row1[0].name) + ', `avatar` = ' + pool.escape(row1[0].avatar) + ', `xp` = ' + parseInt(row1[0].xp) + ', `amount` = ' + amount + ', `game` = ' + pool.escape(gameids[game]) + ', `transactionid` = ' + pool.escape(transactionid) + ', `roundid` = ' + pool.escape(roundid) + ', `time` = ' + pool.escape(time()), function(err5) {
                        if(err5) return callback('INVALID_USER');

                        stats[gameids[game]].games++;
                        stats[gameids[game]].bets = getFormatAmount(stats[gameids[game]] + amount);

                        userService.updateLevel(row1[0].userid, newxp);

                        loggerTrace('[CASINO] Bet registed. ' + row1[0].name + ' did bet $' + getFormatAmountString(amount));

                        callback(null, newbalance);
                    });
                });
            });
        });
	});
}

/* ----- API USAGE ----- */
function finishBet(id, winning, roundid, callback){
    //VERIFY FORMAT AMOUNT
	verifyFormatAmount(winning, function(err1, winning){
		if(err1) return callback('NO_AMOUNT');

        if(winning <= 0) return callback('NO_AMOUNT');

        pool.query('SELECT `userid`, `name`, `avatar`, `xp` FROM `users` WHERE `id` = ' + pool.escape(id), function(err2, row2) {
            if(err2) return callback('INVALID_USER');

            if(row2.length <= 0) return callback('INVALID_USER');

            pool.query('SELECT * FROM `casino_bets` WHERE `roundid` = ' + pool.escape(roundid) + ' AND `userid` = ' + pool.escape(row2[0].userid), function(err3, row3) {
                if(err3) return callback('INVALID_USER');

                if(row3.length <= 0) return callback('INVALID_TRANSACTION');

                //FINISH BET
                userService.finishClassicBet(row2[0].userid, getFormatAmount(row3[0].amount), winning, 'casino', {
                    active: true,
                    visible: true,
                    gameid: row3[0].id,
                    countdown: 3000
                }, function(err4, newbalance){
                    if(err4) return callback('INVALID_USER');

                    pool.query('INSERT INTO `casino_winnings` SET `betid` = ' + pool.escape(row3[0].id) + ', `amount` = ' + winning + ', `time` = ' + pool.escape(time()), function(err5) {
                        if(err5) return callback('INVALID_USER');

                        stats[row3[0].game].winnings = getFormatAmount(stats[row3[0].game] + winning);

                        loggerTrace('[CASINO] Win registed. ' + row2[0].name + ' did win $' + getFormatAmountString(winning));

                        callback(null, newbalance);
                    });
                });
            });
        });
    });
}

module.exports = {
    initializeCasino,
    getKnownGamesList, getSlotsGames, getLiveGames, getFavoritesGames, getAllGames,
    setFavoriteGame, unsetFavoriteGame,
    getLaunchGameDemo, getLaunchGameReal,
    getHotGamesList, getSlotsGamesList, getLiveGamesList,
    getUserDetails, getUserBalance, placeBet, finishBet
};