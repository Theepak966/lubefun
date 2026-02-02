var { pool } = require('@/lib/database.js');
var { emitSocketToUser } = require('@/lib/socket.js');
var { usersOnline } = require('@/lib/globals.js');

var { roundedToFixed, getFormatAmount } = require('@/utils/formatAmount.js');

var config = require('@/config/config.js');

var graphsQueue = {
	queue: [],
	loading: false
};

var statsQueue = {
	queue: [],
	loading: false
};

/* ----- CLIENT USAGE ----- */
function getAllStats(user, socket, stats, cooldown){
	cooldown(true, true);

	if(!config.settings.allowed.admin.includes(user.userid)){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'You don\'t have permission to use that!'
		});

		return cooldown(false, true);
	}

	stats.forEach(function(item){
		processStats(socket, item);
	});

	cooldown(false, false);
}

/* ----- INTERNAL USAGE ----- */
function processStats(socket, stats){
	var stats_allowed = [
		'users_registed', 'users_online',
		'support_closed', 'support_opened',

		'total_bets', 'total_winnings', 'total_profit', 'count_games',

        'crash_total_bets', 'crash_total_winnings', 'crash_total_profit', 'crash_count_games',
        'coinflip_total_bets', 'coinflip_total_winnings', 'coinflip_total_profit', 'coinflip_count_games',
        'blackjack_total_bets', 'blackjack_total_winnings', 'blackjack_total_profit', 'blackjack_count_games',
        'minesweeper_total_bets', 'minesweeper_total_winnings', 'minesweeper_total_profit', 'minesweeper_count_games',
        'tower_total_bets', 'tower_total_winnings', 'tower_total_profit', 'tower_count_games',

        'casino_total_bets', 'casino_total_winnings', 'casino_total_profit', 'casino_count_games',

        'total_deposits', 'count_deposits', 'offers_profit',
        'total_withdrawals', 'count_withdrawals',

        'crypto_total_deposits', 'crypto_count_deposits', 'crypto_total_withdrawals', 'crypto_count_withdrawals'

	];

	if(!stats_allowed.includes(stats)){
		return emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid stats!'
		});
	}

	if(statsQueue.loading) return statsQueue.queue.push({ socket, stats });

	sendStats({ socket, stats });
}

/* ----- INTERNAL USAGE ----- */
function sendStats(item){
	statsQueue.loading = true;

	finishStats(item.stats, function(err1, data){
        if(err1){
            return emitSocketToUser(item.socket, 'message', 'error', {
                message: err1.message
            });
        }

		emitSocketToUser(item.socket, 'dashboard', 'stats', {
			data: data,
			stats: item.stats
		});

		if(statsQueue.queue.length > 0){
			var first = statsQueue.queue[0];

			statsQueue.queue.shift();

			return sendStats(first);
		}

		statsQueue.loading = false;
	});
}

/* ----- INTERNAL USAGE ----- */
function loadStats(stats, callback){
	if(stats == 'users_registed') var query = 'SELECT COUNT(*) AS `users` FROM `users`';
	else if(stats == 'users_online') return callback(null, { online: config.app.chat.channels.reduce((acc, cur) => acc + Object.keys(usersOnline[cur] || {}).filter(a => !usersOnline[cur][a].guest).length, 0) });
    else if(stats == 'support_closed') var query = 'SELECT COUNT(*) AS `count` FROM `support_requests` WHERE `closed` = 1';
	else if(stats == 'support_opened') var query = 'SELECT COUNT(*) AS `count` FROM `support_requests` WHERE `closed` = 0';

	else if(stats == 'total_bets') {
        var query = 'SELECT COALESCE(SUM(amount), 0) AS `total` FROM (' + [
            'SELECT COALESCE(SUM(amount), 0) AS `amount` FROM `users_transactions` WHERE `amount` < 0 AND (' + [ ...Object.keys(config.settings.games.games.original), ...Object.keys(config.settings.games.games.classic) ].map(a => a = '`service` LIKE "' + a + '_%"').join(' OR ') + ')'
        ].join(' UNION ALL ') + ') AS `table`';
    } else if(stats == 'total_winnings') {
        var query = 'SELECT COALESCE(SUM(amount), 0) AS `total` FROM (' + [
            'SELECT COALESCE(SUM(amount), 0) AS `amount` FROM `users_transactions` WHERE `amount` >= 0 AND (' + [ ...Object.keys(config.settings.games.games.original), ...Object.keys(config.settings.games.games.classic) ].map(a => a = '`service` LIKE "' + a + '_%"').join(' OR ') + ')'
        ].join(' UNION ALL ') + ') AS `table`';
    } else if(stats == 'total_profit') {
        var query = 'SELECT COALESCE(SUM(amount), 0) AS `total` FROM (' + [
            'SELECT COALESCE(SUM(amount), 0) AS `amount` FROM `users_transactions` WHERE (' + [ ...Object.keys(config.settings.games.games.original), ...Object.keys(config.settings.games.games.classic) ].map(a => a = '`service` LIKE "' + a + '_%"').join(' OR ') + ')'
        ].join(' UNION ALL ') + ') AS `table`';
    } else if(stats == 'count_games') {
		var query = 'SELECT COALESCE(SUM(total), 0) AS `total` FROM (' + [
            'SELECT COUNT(*) AS `total` FROM `crash_bets`',
            'SELECT COUNT(*) AS `total` FROM `coinflip_games` WHERE `ended` = 1 AND `canceled` = 0',
            'SELECT COUNT(*) AS `total` FROM `blackjack_bets` WHERE `ended` = 1',
            'SELECT COUNT(*) AS `total` FROM `minesweeper_bets` WHERE `ended` = 1',
            'SELECT COUNT(*) AS `total` FROM `tower_bets` WHERE `ended` = 1',
            'SELECT COUNT(*) AS `total` FROM `casino_bets`'
        ].join(' UNION ALL ') + ') AS `table`';
	}

    else if(stats == 'crash_total_bets') var query = 'SELECT COALESCE(SUM(amount), 0) AS `total` FROM `users_transactions` WHERE `amount` < 0 AND `service` LIKE "crash_%"';
	else if(stats == 'crash_total_winnings') var query = 'SELECT COALESCE(SUM(amount), 0) AS `total` FROM `users_transactions` WHERE `amount` >= 0 AND `service` LIKE "crash_%"';
	else if(stats == 'crash_total_profit') var query = 'SELECT COALESCE(SUM(amount), 0) AS `total` FROM `users_transactions` WHERE `service` LIKE "crash_%"';
	else if(stats == 'crash_count_games') var query = 'SELECT COUNT(*) AS `total` FROM `crash_bets`';

    else if(stats == 'coinflip_total_bets') var query = 'SELECT COALESCE(SUM(amount), 0) AS `total` FROM `users_transactions` WHERE `amount` < 0 AND `service` LIKE "coinflip_%"';
	else if(stats == 'coinflip_total_winnings') var query = 'SELECT COALESCE(SUM(amount), 0) AS `total` FROM `users_transactions` WHERE `amount` >= 0 AND `service` LIKE "coinflip_%"';
	else if(stats == 'coinflip_total_profit') var query = 'SELECT COALESCE(SUM(amount), 0) AS `total` FROM `users_transactions` WHERE `service` LIKE "coinflip_%"';
	else if(stats == 'coinflip_count_games') var query = 'SELECT COUNT(*) AS `total` FROM `coinflip_games` WHERE `ended` = 1 AND `canceled` = 0';

    else if(stats == 'blackjack_total_bets') var query = 'SELECT COALESCE(SUM(amount), 0) AS `total` FROM `users_transactions` WHERE `amount` < 0 AND `service` LIKE "blackjack_%"';
	else if(stats == 'blackjack_total_winnings') var query = 'SELECT COALESCE(SUM(amount), 0) AS `total` FROM `users_transactions` WHERE `amount` >= 0 AND `service` LIKE "blackjack_%"';
	else if(stats == 'blackjack_total_profit') var query = 'SELECT COALESCE(SUM(amount), 0) AS `total` FROM `users_transactions` WHERE `service` LIKE "blackjack_%"';
	else if(stats == 'blackjack_count_games') var query = 'SELECT COUNT(*) AS `total` FROM `blackjack_bets` WHERE `ended` = 1';

    else if(stats == 'minesweeper_total_bets') var query = 'SELECT COALESCE(SUM(amount), 0) AS `total` FROM `users_transactions` WHERE `amount` < 0 AND `service` LIKE "minesweeper_%"';
	else if(stats == 'minesweeper_total_winnings') var query = 'SELECT COALESCE(SUM(amount), 0) AS `total` FROM `users_transactions` WHERE `amount` >= 0 AND `service` LIKE "minesweeper_%"';
	else if(stats == 'minesweeper_total_profit') var query = 'SELECT COALESCE(SUM(amount), 0) AS `total` FROM `users_transactions` WHERE `service` LIKE "minesweeper_%"';
	else if(stats == 'minesweeper_count_games') var query = 'SELECT COUNT(*) AS `total` FROM `minesweeper_bets` WHERE `ended` = 1';

    else if(stats == 'tower_total_bets') var query = 'SELECT COALESCE(SUM(amount), 0) AS `total` FROM `users_transactions` WHERE `amount` < 0 AND `service` LIKE "tower_%"';
	else if(stats == 'tower_total_winnings') var query = 'SELECT COALESCE(SUM(amount), 0) AS `total` FROM `users_transactions` WHERE `amount` >= 0 AND `service` LIKE "tower_%"';
	else if(stats == 'tower_total_profit') var query = 'SELECT COALESCE(SUM(amount), 0) AS `total` FROM `users_transactions` WHERE `service` LIKE "tower_%"';
	else if(stats == 'tower_count_games') var query = 'SELECT COUNT(*) AS `total` FROM `tower_bets` WHERE `ended` = 1';

    else if(stats == 'casino_total_bets') var query = 'SELECT COALESCE(SUM(amount), 0) AS `total` FROM `users_transactions` WHERE `amount` < 0 AND `service` LIKE "casino_%"';
	else if(stats == 'casino_total_winnings') var query = 'SELECT COALESCE(SUM(amount), 0) AS `total` FROM `users_transactions` WHERE `amount` >= 0 AND `service` LIKE "casino_%"';
	else if(stats == 'casino_total_profit') var query = 'SELECT COALESCE(SUM(amount), 0) AS `total` FROM `users_transactions` WHERE `service` LIKE "casino_%"';
	else if(stats == 'casino_count_games') var query = 'SELECT COUNT(*) AS `total` FROM `casino_bets`';

    else if(stats == 'crypto_total_deposits') var query = 'SELECT COALESCE(SUM(amount), 0) AS `total` FROM `users_trades` WHERE `type` = ' + pool.escape("deposit") + ' AND `method` = ' + pool.escape("crypto");
	else if(stats == 'crypto_count_deposits') var query = 'SELECT COUNT(*) AS `count` FROM `users_trades` WHERE `type` = ' + pool.escape("deposit") + ' AND `method` = ' + pool.escape("crypto");
	else if(stats == 'crypto_total_withdrawals') var query = 'SELECT COALESCE(SUM(amount), 0) AS `total` FROM `users_trades` WHERE `type` = ' + pool.escape("withdraw") + ' AND `method` = ' + pool.escape("crypto");
	else if(stats == 'crypto_count_withdrawals') var query = 'SELECT COUNT(*) AS `count` FROM `users_trades` WHERE `type` = ' + pool.escape("withdraw") + ' AND `method` = ' + pool.escape("crypto");

    else if(stats == 'total_deposits') var query = 'SELECT COALESCE(SUM(amount), 0) AS `total` FROM `users_trades` WHERE `type` = ' + pool.escape("deposit");
	else if(stats == 'count_deposits') var query = 'SELECT COUNT(*) AS `count` FROM `users_trades` WHERE `type` = ' + pool.escape("deposit");
	else if(stats == 'offers_profit') var query = 'SELECT ((SELECT COALESCE(SUM(amount), 0) AS `total` FROM `users_trades` WHERE `type` = ' + pool.escape("deposit") + ') - (SELECT COALESCE(SUM(amount), 0) AS `total` FROM `users_trades` WHERE `type` = ' + pool.escape("withdraw") + ')) AS `table`';
    else if(stats == 'total_withdrawals') var query = 'SELECT COALESCE(SUM(amount), 0) AS `total` FROM `users_trades` WHERE `type` = ' + pool.escape("withdraw");
	else if(stats == 'count_withdrawals') var query = 'SELECT COUNT(*) AS `count` FROM `users_trades` WHERE `type` = ' + pool.escape("withdraw");

	pool.query(query, function(err1, row1) {
		if(err1) return callback(new Error('An error occurred while loading stats (1)'));

		callback(null, row1);
	});
}

/* ----- INTERNAL USAGE ----- */
function finishStats(stats, callback){
	loadStats(stats, function(err1, data){
		if(err1) return callback(err1);

		var result = '0';

	    if(stats == 'users_registed') result = data[0].users;
		else if(stats == 'users_online') result = data.online;
		else if(stats == 'support_closed') result = data[0].count;
		else if(stats == 'support_opened') result = data[0].count;

		else if(stats == 'total_bets') result = roundedToFixed(-data[0].total, 2).toFixed(2);
		else if(stats == 'total_winnings') result = roundedToFixed(data[0].total, 2).toFixed(2);
		else if(stats == 'total_profit') result = (-roundedToFixed(data[0].total, 2)).toFixed(2);
		else if(stats == 'count_games') result = data[0].total;

        else if(stats == 'crash_total_bets') result = roundedToFixed(-data[0].total, 2).toFixed(2);
		else if(stats == 'crash_total_winnings') result = roundedToFixed(data[0].total, 2).toFixed(2);
		else if(stats == 'crash_total_profit') result = (-roundedToFixed(data[0].total, 2)).toFixed(2);
		else if(stats == 'crash_count_games') result = data[0].total;

        else if(stats == 'coinflip_total_bets') result = roundedToFixed(-data[0].total, 2).toFixed(2);
		else if(stats == 'coinflip_total_winnings') result = roundedToFixed(data[0].total, 2).toFixed(2);
		else if(stats == 'coinflip_total_profit') result = (-roundedToFixed(data[0].total, 2)).toFixed(2);
		else if(stats == 'coinflip_count_games') result = data[0].total;

        else if(stats == 'blackjack_total_bets') result = roundedToFixed(-data[0].total, 2).toFixed(2);
		else if(stats == 'blackjack_total_winnings') result = roundedToFixed(data[0].total, 2).toFixed(2);
		else if(stats == 'blackjack_total_profit') result = (-roundedToFixed(data[0].total, 2)).toFixed(2);
		else if(stats == 'blackjack_count_games') result = data[0].total;

        else if(stats == 'minesweeper_total_bets') result = roundedToFixed(-data[0].total, 2).toFixed(2);
		else if(stats == 'minesweeper_total_winnings') result = roundedToFixed(data[0].total, 2).toFixed(2);
		else if(stats == 'minesweeper_total_profit') result = (-roundedToFixed(data[0].total, 2)).toFixed(2);
		else if(stats == 'minesweeper_count_games') result = data[0].total;

        else if(stats == 'tower_total_bets') result = roundedToFixed(-data[0].total, 2).toFixed(2);
		else if(stats == 'tower_total_winnings') result = roundedToFixed(data[0].total, 2).toFixed(2);
		else if(stats == 'tower_total_profit') result = (-roundedToFixed(data[0].total, 2)).toFixed(2);
		else if(stats == 'tower_count_games') result = data[0].total;

        else if(stats == 'casino_total_bets') result = roundedToFixed(-data[0].total, 2).toFixed(2);
		else if(stats == 'casino_total_winnings') result = roundedToFixed(data[0].total, 2).toFixed(2);
		else if(stats == 'casino_total_profit') result = (-roundedToFixed(data[0].total, 2)).toFixed(2);
		else if(stats == 'casino_count_games') result = data[0].total;

        else if(stats == 'total_deposits') result = roundedToFixed(data[0].total, 2).toFixed(2);
		else if(stats == 'count_deposits') result = data[0].count;
		else if(stats == 'offers_profit') result = roundedToFixed(data[0].total, 2).toFixed(2);
        else if(stats == 'total_withdrawals') result = roundedToFixed(data[0].total, 2).toFixed(2);
		else if(stats == 'count_withdrawals') result = data[0].count;

        else if(stats == 'crypto_total_deposits') result = roundedToFixed(data[0].total, 2).toFixed(2);
		else if(stats == 'crypto_count_deposits') result = data[0].count;
		else if(stats == 'crypto_total_withdrawals') result = roundedToFixed(data[0].total, 2).toFixed(2);
		else if(stats == 'crypto_count_withdrawals') result = data[0].count;

		return callback(null, result);
	});
}

/* ----- CLIENT USAGE ----- */
function getAllGraphs(user, socket, graphs, cooldown){
	cooldown(true, true);

	if(!config.settings.allowed.admin.includes(user.userid)){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'You don\'t have permission to use that!'
		});

		return cooldown(false, true);
	}

	graphs.forEach(function(item){
		processGraph(socket, item);
	});

	cooldown(false, false);
}

/* ----- CLIENT USAGE ----- */
function getGraph(user, socket, graph, cooldown){
	cooldown(true, true);

	if(!config.settings.allowed.admin.includes(user.userid)){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'You don\'t have permission to use that!'
		});

		return cooldown(false, true);
	}

	processGraph(socket, graph);

	cooldown(false, false);
}

/* ----- INTERNAL USAGE ----- */
function processGraph(socket, graph){
	var graphs_allowed = [
		'unique_visitors', 'total_requests',
        'user_registration', 'conversion_registration',

		'tracking_joins',

        'count_games', 'total_profit',

        'crash_games', 'crash_profit',
        'coinflip_games', 'coinflip_profit',
        'blackjack_games', 'blackjack_profit',
        'minesweeper_games', 'minesweeper_profit',
        'tower_games', 'tower_profit',
        'casino_games', 'casino_profit',

        'deposit_count', 'deposit_total',
        'withdraw_count', 'withdraw_total',

        'crypto_deposit_count', 'crypto_deposit_total', 'crypto_withdraw_count', 'crypto_withdraw_total'

	];

	if(!graphs_allowed.includes(graph.graph.split('.')[0])){
		return emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid graph!'
		});
	}

	if(graphsQueue.loading) return graphsQueue.queue.push({ socket, date: graph.date, graph: graph.graph });

	fillGraph({ socket, date: graph.date, graph: graph.graph });
}

/* ----- INTERNAL USAGE ----- */
function fillGraph(item){
	graphsQueue.loading = true;

    if(item.graph == 'conversion_registration'){
        return finishGraph(item.date, 'unique_visitors', function(err1, data1){
            if(err1){
                return emitSocketToUser(item.socket, 'message', 'error', {
                    message: err1.message
                });
            }

            finishGraph(item.date, 'user_registration', function(err2, data2){
                if(err2){
                    return emitSocketToUser(item.socket, 'message', 'error', {
                        message: err2.message
                    });
                }

                var data = Array.from(Array({ 'day': 24, 'week': 7, 'month': 31, 'year': 12 }[item.date]), (a, i) => roundedToFixed(data2[i] / data1[i] * 100, 2));

                sendGraph(item, data);
            });
        });
    }

	finishGraph(item.date, item.graph, function(err1, data){
		if(err1){
            return emitSocketToUser(item.socket, 'message', 'error', {
                message: err1.message
            });
        }

        sendGraph(item, data);
	});
}

/* ----- INTERNAL USAGE ----- */
function sendGraph(item, result){
    var data = {
        'labels': [],
        'data': result
    };

    var months = [ 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December' ];

    if(item.date == 'day') data['labels'] = [ '00', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23' ];
    else if(item.date == 'week') data['labels'] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    else if(item.date == 'month') data['labels'] = [ '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31' ];
    else if(item.date == 'year') data['labels'] = months;

    if(item.date == 'month') for(var i = 0; i < data['labels'].length; i++) data['labels'][i] += ' ' + months[new Date(getDate(item.date) * 1000).getMonth()];
    if(item.date == 'day') for(var i = 0; i < data['labels'].length; i++) data['labels'][i] += ':00';

    emitSocketToUser(item.socket, 'dashboard', 'graph', {
        data: data,
        graph: item.graph
    });

    if(graphsQueue.queue.length > 0){
        var first = graphsQueue.queue[0]

        graphsQueue.queue.shift();

        return fillGraph(first);
    }

    graphsQueue.loading = false;
}

/* ----- INTERNAL USAGE ----- */
function loadGraph(date, graph, callback){
	var time = getDate(date);

	var graph_name = graph.split('.')[0];
	var graph_data = graph.split('.')[1];

	if(graph_name == 'unique_visitors') var query = 'SELECT * FROM `join_visitors` WHERE `time` > ' + pool.escape(time);
	else if(graph_name == 'total_requests') var query = 'SELECT * FROM `join_visitors` WHERE `time` > ' + pool.escape(time);
	else if(graph_name == 'user_registration') var query = 'SELECT * FROM `users` WHERE `time_create` > ' + pool.escape(time);

    else if(graph_name == 'tracking_joins') var query = 'SELECT tracking_joins.* FROM `tracking_joins` INNER JOIN `tracking_links` ON tracking_joins.referral = tracking_links.referral WHERE tracking_links.id = ' + pool.escape(graph_data) + ' AND tracking_links.removed = 0 AND tracking_joins.time > ' + pool.escape(time);

	else if(graph_name == 'count_games') {
		var query = [
            'SELECT `time` FROM `crash_bets` WHERE `time` > ' + pool.escape(time),
            'SELECT coinflip_bets.time FROM `coinflip_games` INNER JOIN `coinflip_bets` ON coinflip_games.id = coinflip_bets.gameid WHERE coinflip_games.ended = 1 AND coinflip_games.canceled = 0 AND coinflip_bets.time > ' + pool.escape(time),
            'SELECT `time` FROM `blackjack_bets` WHERE `ended` = 1 AND `time` > ' + pool.escape(time),
            'SELECT `time` FROM `minesweeper_bets` WHERE `ended` = 1 AND `time` > ' + pool.escape(time),
            'SELECT `time` FROM `tower_bets` WHERE `ended` = 1 AND `time` > ' + pool.escape(time),
            'SELECT `time` FROM `casino_bets` WHERE `time` > ' + pool.escape(time)
        ].join(' UNION ALL ');
	} else if(graph_name == 'total_profit') {
        var query = [
            'SELECT `amount`, `time` FROM `users_transactions` WHERE (' + [ ...Object.keys(config.settings.games.games.original), ...Object.keys(config.settings.games.games.classic) ].map(a => a = '`service` LIKE "' + a + '_%"').join(' OR ') + ') AND `time` > ' + pool.escape(time)
        ].join(' UNION ALL ');
    }

    else if(graph_name == 'crash_games') var query = 'SELECT * FROM `crash_bets` WHERE `time` > ' + pool.escape(time);
	else if(graph_name == 'crash_profit') var query = 'SELECT * FROM `users_transactions` WHERE `service` LIKE "crash_%" AND `time` > ' + pool.escape(time);

    else if(graph_name == 'coinflip_games') var query = 'SELECT coinflip_bets.* FROM `coinflip_games` INNER JOIN `coinflip_bets` ON coinflip_games.id = coinflip_bets.gameid WHERE coinflip_games.ended = 1 AND coinflip_games.canceled = 0 AND coinflip_bets.time > ' + pool.escape(time);
	else if(graph_name == 'coinflip_profit') var query = 'SELECT * FROM `users_transactions` WHERE `service` LIKE "coinflip_%" AND `time` > ' + pool.escape(time);

    else if(graph_name == 'blackjack_games') var query = 'SELECT * FROM `blackjack_bets` WHERE `ended` = 1 AND `time` > ' + pool.escape(time);
	else if(graph_name == 'blackjack_profit') var query = 'SELECT * FROM `users_transactions` WHERE `service` LIKE "blackjack_%" AND `time` > ' + pool.escape(time);

    else if(graph_name == 'minesweeper_games') var query = 'SELECT * FROM `minesweeper_bets` WHERE `ended` = 1 AND `time` > ' + pool.escape(time);
	else if(graph_name == 'minesweeper_profit') var query = 'SELECT * FROM `users_transactions` WHERE `service` LIKE "minesweeper_%" AND `time` > ' + pool.escape(time);

    else if(graph_name == 'tower_games') var query = 'SELECT * FROM `tower_bets` WHERE `ended` = 1 AND `time` > ' + pool.escape(time);
	else if(graph_name == 'tower_profit') var query = 'SELECT * FROM `users_transactions` WHERE `service` LIKE "tower_%" AND `time` > ' + pool.escape(time);

    else if(graph_name == 'casino_games') var query = 'SELECT * FROM `casino_bets` WHERE `time` > ' + pool.escape(time);
	else if(graph_name == 'casino_profit') var query = 'SELECT * FROM `users_transactions` WHERE `service` LIKE "casino_%" AND `time` > ' + pool.escape(time);

    else if(graph_name == 'deposit_count') var query = 'SELECT * FROM `users_trades` WHERE `type` = ' + pool.escape("deposit") + ' AND `time` > ' + pool.escape(time);
	else if(graph_name == 'deposit_total') var query = 'SELECT * FROM `users_trades` WHERE `type` = ' + pool.escape("deposit") + ' AND `time` > ' + pool.escape(time);
    else if(graph_name == 'withdraw_count') var query = 'SELECT * FROM `users_trades` WHERE `type` = ' + pool.escape("withdraw") + ' AND `time` > ' + pool.escape(time);
	else if(graph_name == 'withdraw_total') var query = 'SELECT * FROM `users_trades` WHERE `type` = ' + pool.escape("withdraw") + ' AND `time` > ' + pool.escape(time);

    else if(graph_name == 'crypto_deposit_count') var query = 'SELECT * FROM `users_trades` WHERE `type` = ' + pool.escape("deposit") + ' AND `method` = ' + pool.escape("crypto") + ' AND `time` > ' + pool.escape(time);
	else if(graph_name == 'crypto_deposit_total') var query = 'SELECT * FROM `users_trades` WHERE `type` = ' + pool.escape("deposit") + ' AND `method` = ' + pool.escape("crypto") + ' AND `time` > ' + pool.escape(time);
	else if(graph_name == 'crypto_withdraw_count') var query = 'SELECT * FROM `users_trades` WHERE `type` = ' + pool.escape("withdraw") + ' AND `method` = ' + pool.escape("crypto") + ' AND `time` > ' + pool.escape(time);
	else if(graph_name == 'crypto_withdraw_total') var query = 'SELECT * FROM `users_trades` WHERE `type` = ' + pool.escape("withdraw") + ' AND `method` = ' + pool.escape("crypto") + ' AND `time` > ' + pool.escape(time);

	pool.query(query, function(err1, row1) {
		if(err1) return callback(new Error('An error occurred while loading graph (1)'));

		callback(null, row1);
	});
}

/* ----- INTERNAL USAGE ----- */
function finishGraph(date, graph, callback){
	loadGraph(date, graph, function(err1, data){
		if(err1) return callback(err1);

		var result = Array.from(Array({ 'day': 24, 'week': 7, 'month': 31, 'year': 12 }[date]), () => 0);

        var temp = {};

		var graph_name = graph.split('.')[0];
		var graph_data = graph.split('.')[1];

		data.forEach(function(item){
			if(graph_name == 'unique_visitors') var time_row = item.time;
			else if(graph_name == 'total_requests') var time_row = item.time;
			else if(graph_name == 'user_registration') var time_row = item.time_create;

			else if(graph_name == 'tracking_joins') var time_row = item.time;

			else if(graph_name == 'count_games') var time_row = item.time;
			else if(graph_name == 'total_profit') var time_row = item.time;

            else if(graph_name == 'crash_games') var time_row = item.time;
			else if(graph_name == 'crash_profit') var time_row = item.time;

            else if(graph_name == 'coinflip_games') var time_row = item.time;
			else if(graph_name == 'coinflip_profit') var time_row = item.time;

            else if(graph_name == 'blackjack_games') var time_row = item.time;
			else if(graph_name == 'blackjack_profit') var time_row = item.time;

            else if(graph_name == 'minesweeper_games') var time_row = item.time;
			else if(graph_name == 'minesweeper_profit') var time_row = item.time;

            else if(graph_name == 'tower_games') var time_row = item.time;
			else if(graph_name == 'tower_profit') var time_row = item.time;

            else if(graph_name == 'casino_games') var time_row = item.time;
			else if(graph_name == 'casino_profit') var time_row = item.time;

            else if(graph_name == 'deposit_count') var time_row = item.time;
			else if(graph_name == 'deposit_total') var time_row = item.time;
            else if(graph_name == 'withdraw_count') var time_row = item.time;
			else if(graph_name == 'withdraw_total') var time_row = item.time;

            else if(graph_name == 'crypto_deposit_count') var time_row = item.time;
			else if(graph_name == 'crypto_deposit_total') var time_row = item.time;
			else if(graph_name == 'crypto_withdraw_count') var time_row = item.time;
			else if(graph_name == 'crypto_withdraw_total') var time_row = item.time;

			if(date == 'day') var time = new Date(time_row * 1000).getHours();
			else if(date == 'week') var time = (new Date(time_row * 1000).getDay() + 6) % 7;
			else if(date == 'month') var time = new Date(time_row * 1000).getDate() - 1;
			else if(date == 'year') var time = new Date(time_row * 1000).getMonth();

			if(graph_name == 'unique_visitors') {
                if(temp[time] === undefined) temp[time] = {};

                var add = (temp[time][item.ip] === undefined) ? 1 : 0;

                if(temp[time][item.ip] === undefined) temp[time][item.ip] = true;
            } else if(graph_name == 'total_requests') var add = 1;
			else if(graph_name == 'user_registration') var add = 1;

			else if(graph_name == 'tracking_joins') var add = 1;

			else if(graph_name == 'count_games') var add = 1;
			else if(graph_name == 'total_profit') var add = -getFormatAmount(item.amount);

            else if(graph_name == 'crash_games') var add = 1;
			else if(graph_name == 'crash_profit') var add = -getFormatAmount(item.amount);

            else if(graph_name == 'coinflip_games') var add = 1;
			else if(graph_name == 'coinflip_profit') var add = -getFormatAmount(item.amount);

            else if(graph_name == 'blackjack_games') var add = 1;
			else if(graph_name == 'blackjack_profit') var add = -getFormatAmount(item.amount);

            else if(graph_name == 'minesweeper_games') var add = 1;
			else if(graph_name == 'minesweeper_profit') var add = -getFormatAmount(item.amount);

            else if(graph_name == 'tower_games') var add = 1;
			else if(graph_name == 'tower_profit') var add = -getFormatAmount(item.amount);

            else if(graph_name == 'casino_games') var add = 1;
			else if(graph_name == 'casino_profit') var add = -getFormatAmount(item.amount);

            else if(graph_name == 'deposit_count') var add = 1;
			else if(graph_name == 'deposit_total') var add = getFormatAmount(item.amount);
            else if(graph_name == 'withdraw_count') var add = 1;
			else if(graph_name == 'withdraw_total') var add = getFormatAmount(item.amount);

            else if(graph_name == 'crypto_deposit_count') var add = 1;
			else if(graph_name == 'crypto_deposit_total') var add = getFormatAmount(item.amount);
			else if(graph_name == 'crypto_withdraw_count') var add = 1;
			else if(graph_name == 'crypto_withdraw_total') var add = getFormatAmount(item.amount);

			result[time] += add;
		});

		for(var i = 0; i < result.length; i++) {
			if(graph_name == 'unique_visitors') result[i] = Math.floor(result[i]);
			else if(graph_name == 'total_requests') result[i] = Math.floor(result[i]);
			else if(graph_name == 'user_registration') result[i] = Math.floor(result[i]);

			else if(graph_name == 'tracking_joins') result[i] = Math.floor(result[i]);

			else if(graph_name == 'count_games') result[i] = Math.floor(result[i]);
			else if(graph_name == 'total_profit') result[i] = getFormatAmount(result[i]);

            else if(graph_name == 'crash_games') result[i] = Math.floor(result[i]);
			else if(graph_name == 'crash_profit') result[i] = getFormatAmount(result[i]);

            else if(graph_name == 'coinflip_games') result[i] = Math.floor(result[i]);
			else if(graph_name == 'coinflip_profit') result[i] = getFormatAmount(result[i]);

            else if(graph_name == 'blackjack_games') result[i] = Math.floor(result[i]);
			else if(graph_name == 'blackjack_profit') result[i] = getFormatAmount(result[i]);

            else if(graph_name == 'minesweeper_games') result[i] = Math.floor(result[i]);
			else if(graph_name == 'minesweeper_profit') result[i] = getFormatAmount(result[i]);

            else if(graph_name == 'tower_games') result[i] = Math.floor(result[i]);
			else if(graph_name == 'tower_profit') result[i] = getFormatAmount(result[i]);

            else if(graph_name == 'casino_games') result[i] = Math.floor(result[i]);
			else if(graph_name == 'casino_profit') result[i] = getFormatAmount(result[i]);

            else if(graph_name == 'deposit_count') result[i] = Math.floor(result[i]);
			else if(graph_name == 'deposit_total') result[i] = getFormatAmount(result[i]);
            else if(graph_name == 'withdraw_count') result[i] = Math.floor(result[i]);
			else if(graph_name == 'withdraw_total') result[i] = getFormatAmount(result[i]);

            else if(graph_name == 'crypto_deposit_count') result[i] = Math.floor(result[i]);
			else if(graph_name == 'crypto_deposit_total') result[i] = getFormatAmount(result[i]);
			else if(graph_name == 'crypto_withdraw_count') result[i] = Math.floor(result[i]);
			else if(graph_name == 'crypto_withdraw_total') result[i] = getFormatAmount(result[i]);

		}

		return callback(null, result);
	});
}

function getDate(type){
	var date = new Date();

	if(type == 'day'){
		var year = date.getFullYear();
		var month = date.getMonth();
		var day = date.getDate();

		var new_date = new Date(year + '-' + (month + 1) + '-' + day);

		return Math.floor(new_date.getTime() / 1000);
	} else if(type == 'week'){
		var date = new Date();
		var year = date.getFullYear();
		var month = date.getMonth();
		var day = date.getDate();
		var week = (date.getDay() + 6) % 7;

		if(week >= day){
			var last_date = new Date(year, (month + 11) % 12, 0);

			month--;
			day += last_date.getDate();

			if(month < 0) {
				month = 11;
				year--;
			}
		}

		var new_date = new Date(year + '-' + (month + 1) + '-' + (day - week));

		return Math.floor(new_date.getTime() / 1000);
	} else if(type == 'month'){
		var date = new Date();
		var year = date.getFullYear();
		var month = date.getMonth();

		var new_date = new Date(year + '-' + (month + 1) + '-01');

		return Math.floor(new_date.getTime() / 1000);
	} else if(type == 'year'){
		var date = new Date();
		var year = date.getFullYear();

		var new_date = new Date(year + '-01-01');

		return Math.floor(new_date.getTime() / 1000);
	}
}

module.exports = {
	getAllStats, getAllGraphs, getGraph
};