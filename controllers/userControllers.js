var { pool } = require('@/lib/database.js');

var { haveRankPermission, calculateLevel } = require('@/utils/utils.js');
var { roundedToFixed, getFormatAmount, getFormatAmountString } = require('@/utils/formatAmount.js');
var { makeDate } = require('@/utils/formatDate.js');

var config = require('@/config/config.js');

exports.userUnset = async (req, res, next) => {
    var userid = req.params.userid;

    res.redirect('/user/' + userid + '/deposits');
};

exports.userPrivate = async (req, res, next) => {
    res.render('userPrivate', {
        page: 'user',
        name: config.app.pages['user']
    });
};

exports.userDeposits = async (req, res, next) => {
    if(!haveRankPermission('view_user', res.locals.user ? res.locals.user.rank : 0)) return next();

    var userid = req.params.userid;

    pool.query('SELECT `userid`, `name`, `avatar`, `xp`, `time_create` FROM `users` WHERE `userid` = ' + pool.escape(userid), function(err1, row1) {
        if(err1) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering user deposits page (1)' });

        if(row1.length <= 0) return next();

        var level = calculateLevel(row1[0].xp);

        //DEPOSITED
        pool.query('SELECT SUM(`amount`) AS `deposited` FROM `users_trades` WHERE `userid` = ' + pool.escape(row1[0].userid) + ' AND `type` = "deposit"', function(err2, row2) {
            if(err2) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering user deposits page (2)' });

            //WITHDRAWN
            pool.query('SELECT SUM(`amount`) AS `withdrawn` FROM `users_trades` WHERE `userid` = ' + pool.escape(row1[0].userid) + ' AND `type` = "withdraw"', function(err3, row3) {
                if(err3) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering user deposits page (3)' });

                //WAGERED
                pool.query('SELECT -SUM(`amount`) AS `wagered` FROM `users_transactions` WHERE (' + [ ...Object.keys(config.settings.games.games.original), ...Object.keys(config.settings.games.games.classic) ].map(a => '`service` LIKE "' + a + '_%"').join(' OR ') + ') AND `userid` = ' + pool.escape(row1[0].userid) + ' AND `amount` < 0', function(err4, row4) {
                    if(err4) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering user deposits page (4)' });

                    //WINNINGS
                    pool.query('SELECT SUM(`amount`) AS `winnings` FROM `users_transactions` WHERE (' + [ ...Object.keys(config.settings.games.games.original), ...Object.keys(config.settings.games.games.classic) ].map(a => '`service` LIKE "' + a + '_%"').join(' OR ') + ') AND `userid` = ' + pool.escape(row1[0].userid) + ' AND `amount` > 0', function(err5, row5) {
                        if(err5) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering user deposits page (5)' });

                        //DEPOSIT TRANSACTIONS
                        pool.query([
                                'SELECT COUNT(*) AS `count` FROM `crypto_transactions` WHERE `userid` = ' + pool.escape(row1[0].userid) + ' AND `type` = "deposit"'
                            ].join(' UNION ALL '), function(err6, row6) {
                            if(err6) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering user deposits page (6)' });

                            pool.query([
                                    'SELECT `transactionid` AS `id`, `status`, `amount`, `paid` * `exchange` AS `paid`, "crypto" AS `method`, `currency` AS `game`, `time` FROM `crypto_transactions` WHERE `userid` = ' + pool.escape(row1[0].userid) + ' AND `type` = "deposit"'
                                ].join(' UNION ALL ') + ' ORDER BY `time` DESC LIMIT 10', function(err7, row7) {
			                    if(err7) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering user deposits page (7)' });

                                var pages = Math.ceil(row6.reduce((acc, cur) => acc + cur.count, 0) / 10);

                                res.render('userDeposits', {
                                    page: 'user',
                                    name: config.app.pages['user'],
                                    response: {
                                        user: {
                                            user: {
                                                userid: row1[0].userid,
                                                name: row1[0].name,
                                                avatar: row1[0].avatar,
                                                rank: config.app.ranks[row1[0].rank],
                                                level: {
                                                    ...level,
                                                    ...{
                                                        tier: [ 'steel', 'bronze', 'silver', 'gold', 'diamond' ][Math.floor(level.level / 25)],
                                                        progress: roundedToFixed((level.have - level.start) / (level.next - level.start) * 100, 2).toFixed(2)
                                                    }
                                                },
                                                created: makeDate(new Date(row1[0].time_create * 1000))
                                            },
                                            stats: {
                                                deposited: getFormatAmountString(row2[0].deposited),
                                                withdrawn: getFormatAmountString(row3[0].withdrawn),
                                                wagered: getFormatAmountString(row4[0].wagered),
                                                profit: getFormatAmountString(getFormatAmount(row5[0].winnings) - getFormatAmount(row4[0].wagered))
                                            },
                                            deposits: {
                                                list: row7.map(function(item){
                                                    var status = {
                                                        'crypto': item.status == 5 ? 'completed' : item.status == 4 ? 'partially_paid' : item.status < 0 ? 'declined' : 'pending'
                                                    }[item.method];

                                                    return {
                                                        id: item.id || '-',
                                                        amount: getFormatAmountString(item.amount),
                                                        paid: getFormatAmountString(item.paid),
                                                        method: item.game,
                                                        status: status,
                                                        date: makeDate(new Date(item.time * 1000))
                                                    };
                                                }),
                                                pages: pages > 0 ? pages : 1,
                                                page: 1
                                            }
                                        }
                                    }
                                });
                            });
                        });
                    });
                });
            });
        });
    });
};

exports.userWithdrawals = async (req, res, next) => {
    if(!haveRankPermission('view_user', res.locals.user ? res.locals.user.rank : 0)) return next();

    var userid = req.params.userid;

    pool.query('SELECT `userid`, `name`, `avatar`, `xp`, `time_create` FROM `users` WHERE `userid` = ' + pool.escape(userid), function(err1, row1) {
        if(err1) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering user withdrawals page (1)' });

        if(row1.length <= 0) return next();

        var level = calculateLevel(row1[0].xp);

        //DEPOSITED
        pool.query('SELECT SUM(`amount`) AS `deposited` FROM `users_trades` WHERE `userid` = ' + pool.escape(row1[0].userid) + ' AND `type` = "deposit"', function(err2, row2) {
            if(err2) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering user withdrawals page (2)' });

            //WITHDRAWN
            pool.query('SELECT SUM(`amount`) AS `withdrawn` FROM `users_trades` WHERE `userid` = ' + pool.escape(row1[0].userid) + ' AND `type` = "withdraw"', function(err3, row3) {
                if(err3) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering user withdrawals page (3)' });

                //WAGERED
                pool.query('SELECT -SUM(`amount`) AS `wagered` FROM `users_transactions` WHERE (' + [ ...Object.keys(config.settings.games.games.original), ...Object.keys(config.settings.games.games.classic) ].map(a => '`service` LIKE "' + a + '_%"').join(' OR ') + ') AND `userid` = ' + pool.escape(row1[0].userid) + ' AND `amount` < 0', function(err4, row4) {
                    if(err4) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering user withdrawals page (4)' });

                    //WINNINGS
                    pool.query('SELECT SUM(`amount`) AS `winnings` FROM `users_transactions` WHERE (' + [ ...Object.keys(config.settings.games.games.original), ...Object.keys(config.settings.games.games.classic) ].map(a => '`service` LIKE "' + a + '_%"').join(' OR ') + ') AND `userid` = ' + pool.escape(row1[0].userid) + ' AND `amount` > 0', function(err5, row5) {
                        if(err5) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering user withdrawals page (5)' });

                        //WITHDRAW TRANSACTIONS
                        pool.query([
                                'SELECT COUNT(*) AS `count` FROM `crypto_transactions` WHERE `userid` = ' + pool.escape(row1[0].userid) + ' AND `type` = "withdraw"'
                            ].join(' UNION ALL '), function(err6, row6) {
                            if(err6) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account withdrawals page (6)' });

                            pool.query([
                                    'SELECT `transactionid` AS `id`, `status`, `amount`, "crypto" AS `method`, `currency` AS `game`, `time` FROM `crypto_transactions` WHERE `userid` = ' + pool.escape(row1[0].userid) + ' AND `type` = "withdraw"'
                                ].join(' UNION ALL ') + ' ORDER BY `time` DESC LIMIT 10', function(err7, row7) {
                                if(err7) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account withdrawals page (7)' });

                                var pages = Math.ceil(row6.reduce((acc, cur) => acc + cur.count, 0) / 10);

                                res.render('userWithdrawals', {
                                    page: 'user',
                                    name: config.app.pages['user'],
                                    response: {
                                        user: {
                                            user: {
                                                userid: row1[0].userid,
                                                name: row1[0].name,
                                                avatar: row1[0].avatar,
                                                rank: config.app.ranks[row1[0].rank],
                                                level: {
                                                    ...level,
                                                    ...{
                                                        tier: [ 'steel', 'bronze', 'silver', 'gold', 'diamond' ][Math.floor(level.level / 25)],
                                                        progress: roundedToFixed((level.have - level.start) / (level.next - level.start) * 100, 2).toFixed(2)
                                                    }
                                                },
                                                created: makeDate(new Date(row1[0].time_create * 1000))
                                            },
                                            stats: {
                                                deposited: getFormatAmountString(row2[0].deposited),
                                                withdrawn: getFormatAmountString(row3[0].withdrawn),
                                                wagered: getFormatAmountString(row4[0].wagered),
                                                profit: getFormatAmountString(getFormatAmount(row5[0].winnings) - getFormatAmount(row4[0].wagered))
                                            },
                                            withdrawals: {
                                                list: row7.map(function(item){
                                                    var status = {
                                                        'crypto': item.status == 4 ? 'completed' : item.status < 0 ? 'declined' : 'pending'
                                                    }[item.method];

                                                    return {
                                                        id: item.id || '-',
                                                        amount: getFormatAmountString(item.amount),
                                                        method: item.game,
                                                        status: status,
                                                        date: makeDate(new Date(item.time * 1000))
                                                    };
                                                }),
                                                pages: pages > 0 ? pages : 1,
                                                page: 1
                                            }
                                        }
                                    }
                                });
                            });
                        });
                    });
                });
            });
        });
    });
};

exports.userGamesUnset = async (req, res, next) => {
    if(!haveRankPermission('view_user', res.locals.user ? res.locals.user.rank : 0)) return next();

    var userid = req.params.userid;

    res.redirect('/user/' + userid + '/games/' + [ ...Object.keys(config.settings.games.games.original), ...Object.keys(config.settings.games.games.classic) ][0]);
};

exports.userGamesCrash = async (req, res, next) => {
    if(!haveRankPermission('view_user', res.locals.user ? res.locals.user.rank : 0)) return next();

    var userid = req.params.userid;

    pool.query('SELECT `userid`, `name`, `avatar`, `xp`, `time_create` FROM `users` WHERE `userid` = ' + pool.escape(userid), function(err1, row1) {
        if(err1) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering user crash games history page (1)' });

        if(row1.length <= 0) return next();

        var level = calculateLevel(row1[0].xp);

        //DEPOSITED
        pool.query('SELECT SUM(`amount`) AS `deposited` FROM `users_trades` WHERE `userid` = ' + pool.escape(row1[0].userid) + ' AND `type` = "deposit"', function(err2, row2) {
            if(err2) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering user crash games history page (2)' });

            //WITHDRAWN
            pool.query('SELECT SUM(`amount`) AS `withdrawn` FROM `users_trades` WHERE `userid` = ' + pool.escape(row1[0].userid) + ' AND `type` = "withdraw"', function(err3, row3) {
                if(err3) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering user deposcrash games historyits page (3)' });

                //WAGERED
                pool.query('SELECT -SUM(`amount`) AS `wagered` FROM `users_transactions` WHERE (' + [ ...Object.keys(config.settings.games.games.original), ...Object.keys(config.settings.games.games.classic) ].map(a => '`service` LIKE "' + a + '_%"').join(' OR ') + ') AND `userid` = ' + pool.escape(row1[0].userid) + ' AND `amount` < 0', function(err4, row4) {
                    if(err4) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering user crash games history page (4)' });

                    //WINNINGS
                    pool.query('SELECT SUM(`amount`) AS `winnings` FROM `users_transactions` WHERE (' + [ ...Object.keys(config.settings.games.games.original), ...Object.keys(config.settings.games.games.classic) ].map(a => '`service` LIKE "' + a + '_%"').join(' OR ') + ') AND `userid` = ' + pool.escape(row1[0].userid) + ' AND `amount` > 0', function(err5, row5) {
                        if(err5) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering user crash games history page (5)' });

                        //CRASH HISTORY
                        pool.query('SELECT COUNT(*) AS `count` FROM `crash_bets` INNER JOIN `crash_rolls` ON crash_bets.gameid = crash_rolls.id WHERE crash_bets.userid = ' + pool.escape(row1[0].userid) + ' AND crash_rolls.ended = 1', function(err6, row6) {
                            if(err6) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering user crash games history page (6)' });

                            pool.query('SELECT crash_bets.id, crash_bets.amount, crash_bets.cashedout, crash_bets.point, crash_bets.time FROM `crash_bets` INNER JOIN `crash_rolls` ON crash_bets.gameid = crash_rolls.id WHERE crash_bets.userid = ' + pool.escape(row1[0].userid) + ' AND crash_rolls.ended = 1 ORDER BY crash_bets.id DESC LIMIT 10', function(err7, row7) {
                                if(err7) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering user crash games history page (7)' });

                                var pages = Math.ceil(row6[0].count / 10);

                                res.render('userGamesCrash', {
                                    page: 'user',
                                    name: config.app.pages['user'],
                                    response: {
                                        user: {
                                            user: {
                                                userid: row1[0].userid,
                                                name: row1[0].name,
                                                avatar: row1[0].avatar,
                                                rank: config.app.ranks[row1[0].rank],
                                                level: {
                                                    ...level,
                                                    ...{
                                                        tier: [ 'steel', 'bronze', 'silver', 'gold', 'diamond' ][Math.floor(level.level / 25)],
                                                        progress: roundedToFixed((level.have - level.start) / (level.next - level.start) * 100, 2).toFixed(2)
                                                    }
                                                },
                                                created: makeDate(new Date(row1[0].time_create * 1000))
                                            },
                                            stats: {
                                                deposited: getFormatAmountString(row2[0].deposited),
                                                withdrawn: getFormatAmountString(row3[0].withdrawn),
                                                wagered: getFormatAmountString(row4[0].wagered),
                                                profit: getFormatAmountString(getFormatAmount(row5[0].winnings) - getFormatAmount(row4[0].wagered))
                                            },
                                            games: {
                                                game: 'crash',
                                                list: row7.map(function(item){
                                                    var amount = getFormatAmount(item.amount);
                                                    var winnings = 0;
                                                    if(parseInt(item.cashedout)) winnings = getFormatAmount(amount * roundedToFixed(item.point, 2));

                                                    var profit = getFormatAmount(winnings - amount);

                                                    return {
                                                        id: item.id,
                                                        multiplier: roundedToFixed(item.point, 2).toFixed(2),
                                                        amount: getFormatAmountString(amount),
                                                        profit: getFormatAmountString(profit),
                                                        status: parseInt(item.cashedout) ? 'win': 'loss',
                                                        date: makeDate(new Date(item.time * 1000))
                                                    };
                                                }),
                                                pages: pages > 0 ? pages : 1,
                                                page: 1
                                            }
                                        }
                                    }
                                });
                            });
                        });
                    });
                });
            });
        });
    });
};

exports.userGamesCoinflip = async (req, res, next) => {
    if(!haveRankPermission('view_user', res.locals.user ? res.locals.user.rank : 0)) return next();

    var userid = req.params.userid;

    pool.query('SELECT `userid`, `name`, `avatar`, `xp`, `time_create` FROM `users` WHERE `userid` = ' + pool.escape(userid), function(err1, row1) {
        if(err1) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering user coinflip games history page (1)' });

        if(row1.length <= 0) return next();

        var level = calculateLevel(row1[0].xp);

        //DEPOSITED
        pool.query('SELECT SUM(`amount`) AS `deposited` FROM `users_trades` WHERE `userid` = ' + pool.escape(row1[0].userid) + ' AND `type` = "deposit"', function(err2, row2) {
            if(err2) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering user coinflip games history page (2)' });

            //WITHDRAWN
            pool.query('SELECT SUM(`amount`) AS `withdrawn` FROM `users_trades` WHERE `userid` = ' + pool.escape(row1[0].userid) + ' AND `type` = "withdraw"', function(err3, row3) {
                if(err3) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering user coinflip games history page (3)' });

                //WAGERED
                pool.query('SELECT -SUM(`amount`) AS `wagered` FROM `users_transactions` WHERE (' + [ ...Object.keys(config.settings.games.games.original), ...Object.keys(config.settings.games.games.classic) ].map(a => '`service` LIKE "' + a + '_%"').join(' OR ') + ') AND `userid` = ' + pool.escape(row1[0].userid) + ' AND `amount` < 0', function(err4, row4) {
                    if(err4) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering user coinflip games history page (4)' });

                    //WINNINGS
                    pool.query('SELECT SUM(`amount`) AS `winnings` FROM `users_transactions` WHERE (' + [ ...Object.keys(config.settings.games.games.original), ...Object.keys(config.settings.games.games.classic) ].map(a => '`service` LIKE "' + a + '_%"').join(' OR ') + ') AND `userid` = ' + pool.escape(row1[0].userid) + ' AND `amount` > 0', function(err5, row5) {
                        if(err5) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering user coinflip games history page (5)' });

                        //COINFLIP HISTORY
                        pool.query('SELECT COUNT(*) AS `count` FROM `coinflip_bets` INNER JOIN `coinflip_games` ON coinflip_bets.gameid = coinflip_games.id INNER JOIN `coinflip_rolls` ON coinflip_games.id = coinflip_rolls.gameid INNER JOIN `coinflip_winnings` ON coinflip_games.id = coinflip_winnings.gameid WHERE coinflip_bets.userid = ' + pool.escape(row1[0].userid) + ' AND coinflip_games.ended = 1 AND coinflip_rolls.removed = 0', function(err6, row6) {
                            if(err6) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering user coinflip games history page (6)' });

                            pool.query('SELECT coinflip_bets.id, IF(coinflip_bets.position = coinflip_winnings.position, 1, 0) AS `status`, coinflip_games.amount, coinflip_winnings.amount AS `winnings`, coinflip_bets.time FROM `coinflip_bets` INNER JOIN `coinflip_games` ON coinflip_bets.gameid = coinflip_games.id INNER JOIN `coinflip_rolls` ON coinflip_games.id = coinflip_rolls.gameid INNER JOIN `coinflip_winnings` ON coinflip_games.id = coinflip_winnings.gameid WHERE coinflip_bets.userid = ' + pool.escape(row1[0].userid) + ' AND coinflip_games.ended = 1 AND coinflip_rolls.removed = 0 ORDER BY coinflip_bets.id DESC LIMIT 10', function(err7, row7) {
                                if(err7) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering user coinflip games history page (7)' });

                                var pages = Math.ceil(row6[0].count / 10);

                                res.render('userGamesCoinflip', {
                                    page: 'user',
                                    name: config.app.pages['user'],
                                    response: {
                                        user: {
                                            user: {
                                                userid: row1[0].userid,
                                                name: row1[0].name,
                                                avatar: row1[0].avatar,
                                                rank: config.app.ranks[row1[0].rank],
                                                level: {
                                                    ...level,
                                                    ...{
                                                        tier: [ 'steel', 'bronze', 'silver', 'gold', 'diamond' ][Math.floor(level.level / 25)],
                                                        progress: roundedToFixed((level.have - level.start) / (level.next - level.start) * 100, 2).toFixed(2)
                                                    }
                                                },
                                                created: makeDate(new Date(row1[0].time_create * 1000))
                                            },
                                            stats: {
                                                deposited: getFormatAmountString(row2[0].deposited),
                                                withdrawn: getFormatAmountString(row3[0].withdrawn),
                                                wagered: getFormatAmountString(row4[0].wagered),
                                                profit: getFormatAmountString(getFormatAmount(row5[0].winnings) - getFormatAmount(row4[0].wagered))
                                            },
                                            games: {
                                                game: 'coinflip',
                                                list: row7.map(function(item){
                                                    var amount = getFormatAmount(item.amount);
                                                    var winnings = 0;
                                                    if(parseInt(item.status)) winnings = getFormatAmount(item.winnings);

                                                    var profit = getFormatAmount(winnings - amount);

                                                    return {
                                                        id: item.id,
                                                        amount: getFormatAmountString(amount),
                                                        profit: getFormatAmountString(profit),
                                                        status: parseInt(item.status) ? 'win': 'loss',
                                                        date: makeDate(new Date(item.time * 1000))
                                                    };
                                                }),
                                                pages: pages > 0 ? pages : 1,
                                                page: 1
                                            }
                                        }
                                    }
                                });
                            });
                        });
                    });
                });
            });
        });
    });
};

exports.userGamesBlackjack = async (req, res, next) => {
    if(!haveRankPermission('view_user', res.locals.user ? res.locals.user.rank : 0)) return next();

    var userid = req.params.userid;

    pool.query('SELECT `userid`, `name`, `avatar`, `xp`, `time_create` FROM `users` WHERE `userid` = ' + pool.escape(userid), function(err1, row1) {
        if(err1) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering user blackjack games history page (1)' });

        if(row1.length <= 0) return next();

        var level = calculateLevel(row1[0].xp);

        //DEPOSITED
        pool.query('SELECT SUM(`amount`) AS `deposited` FROM `users_trades` WHERE `userid` = ' + pool.escape(row1[0].userid) + ' AND `type` = "deposit"', function(err2, row2) {
            if(err2) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering user blackjack games history page (2)' });

            //WITHDRAWN
            pool.query('SELECT SUM(`amount`) AS `withdrawn` FROM `users_trades` WHERE `userid` = ' + pool.escape(row1[0].userid) + ' AND `type` = "withdraw"', function(err3, row3) {
                if(err3) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering user blackjack games history page (3)' });

                //WAGERED
                pool.query('SELECT -SUM(`amount`) AS `wagered` FROM `users_transactions` WHERE (' + [ ...Object.keys(config.settings.games.games.original), ...Object.keys(config.settings.games.games.classic) ].map(a => '`service` LIKE "' + a + '_%"').join(' OR ') + ') AND `userid` = ' + pool.escape(row1[0].userid) + ' AND `amount` < 0', function(err4, row4) {
                    if(err4) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering user blackjack games history page (4)' });

                    //WINNINGS
                    pool.query('SELECT SUM(`amount`) AS `winnings` FROM `users_transactions` WHERE (' + [ ...Object.keys(config.settings.games.games.original), ...Object.keys(config.settings.games.games.classic) ].map(a => '`service` LIKE "' + a + '_%"').join(' OR ') + ') AND `userid` = ' + pool.escape(row1[0].userid) + ' AND `amount` > 0', function(err5, row5) {
                        if(err5) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering user blackjack games history page (5)' });

                        //BLACKJACK HISTORY
                        pool.query('SELECT COUNT(*) AS `count` FROM `blackjack_bets` WHERE `userid` = ' + pool.escape(row1[0].userid) + ' AND `ended` = 1', function(err6, row6) {
                            if(err6) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering user blackjack games history page (6)' });

                            pool.query('SELECT `id`, `amount`, `winning`, `result`, `time` FROM `blackjack_bets` WHERE `userid` = ' + pool.escape(row1[0].userid) + ' AND `ended` = 1 ORDER BY `id` DESC LIMIT 10', function(err7, row7) {
                                if(err7) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering user blackjack games history page (7)' });

                                var pages = Math.ceil(row6[0].count / 10);

                                res.render('userGamesBlackjack', {
                                    page: 'user',
                                    name: config.app.pages['user'],
                                    response: {
                                        user: {
                                            user: {
                                                userid: row1[0].userid,
                                                name: row1[0].name,
                                                avatar: row1[0].avatar,
                                                rank: config.app.ranks[row1[0].rank],
                                                level: {
                                                    ...level,
                                                    ...{
                                                        tier: [ 'steel', 'bronze', 'silver', 'gold', 'diamond' ][Math.floor(level.level / 25)],
                                                        progress: roundedToFixed((level.have - level.start) / (level.next - level.start) * 100, 2).toFixed(2)
                                                    }
                                                },
                                                created: makeDate(new Date(row1[0].time_create * 1000))
                                            },
                                            stats: {
                                                deposited: getFormatAmountString(row2[0].deposited),
                                                withdrawn: getFormatAmountString(row3[0].withdrawn),
                                                wagered: getFormatAmountString(row4[0].wagered),
                                                profit: getFormatAmountString(getFormatAmount(row5[0].winnings) - getFormatAmount(row4[0].wagered))
                                            },
                                            games: {
                                                game: 'blackjack',
                                                list: row7.map(function(item){
                                                    var amount = getFormatAmount(item.amount);
                                                    var winnings = getFormatAmount(item.winning);
                                                    var profit = getFormatAmount(winnings - amount);

                                                    var status = (profit > 0) ? (item.result === 'blackjack' ? 'blackjack' : 'win') : (profit < 0 ? 'loss' : 'push');

                                                    return {
                                                        id: item.id,
                                                        result: item.result || '-',
                                                        amount: getFormatAmountString(amount),
                                                        profit: getFormatAmountString(profit),
                                                        status: status,
                                                        date: makeDate(new Date(item.time * 1000))
                                                    };
                                                }),
                                                pages: pages > 0 ? pages : 1,
                                                page: 1
                                            }
                                        }
                                    }
                                });
                            });
                        });
                    });
                });
            });
        });
    });
};

exports.userGamesTower = async (req, res, next) => {
    if(!haveRankPermission('view_user', res.locals.user ? res.locals.user.rank : 0)) return next();

    var userid = req.params.userid;

    pool.query('SELECT `userid`, `name`, `avatar`, `xp`, `time_create` FROM `users` WHERE `userid` = ' + pool.escape(userid), function(err1, row1) {
        if(err1) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering user tower games history page (1)' });

        if(row1.length <= 0) return next();

        var level = calculateLevel(row1[0].xp);

        //DEPOSITED
        pool.query('SELECT SUM(`amount`) AS `deposited` FROM `users_trades` WHERE `userid` = ' + pool.escape(row1[0].userid) + ' AND `type` = "deposit"', function(err2, row2) {
            if(err2) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering user tower games history page (2)' });

            //WITHDRAWN
            pool.query('SELECT SUM(`amount`) AS `withdrawn` FROM `users_trades` WHERE `userid` = ' + pool.escape(row1[0].userid) + ' AND `type` = "withdraw"', function(err3, row3) {
                if(err3) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering user tower games history page (3)' });

                //WAGERED
                pool.query('SELECT -SUM(`amount`) AS `wagered` FROM `users_transactions` WHERE (' + [ ...Object.keys(config.settings.games.games.original), ...Object.keys(config.settings.games.games.classic) ].map(a => '`service` LIKE "' + a + '_%"').join(' OR ') + ') AND `userid` = ' + pool.escape(row1[0].userid) + ' AND `amount` < 0', function(err4, row4) {
                    if(err4) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering user tower games history page (4)' });

                    //WINNINGS
                    pool.query('SELECT SUM(`amount`) AS `winnings` FROM `users_transactions` WHERE (' + [ ...Object.keys(config.settings.games.games.original), ...Object.keys(config.settings.games.games.classic) ].map(a => '`service` LIKE "' + a + '_%"').join(' OR ') + ') AND `userid` = ' + pool.escape(row1[0].userid) + ' AND `amount` > 0', function(err5, row5) {
                        if(err5) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering user tower games history page (5)' });

                        //TOWER HISTORY
                        pool.query('SELECT COUNT(*) AS `count` FROM `tower_bets` WHERE `userid` = ' + pool.escape(row1[0].userid) + ' AND `ended` = 1', function(err6, row6) {
                            if(err6) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering user tower games history page (6)' });

                            pool.query('SELECT `id`, `amount`, `winning`, `difficulty`, `time` FROM `tower_bets` WHERE `userid` = ' + pool.escape(row1[0].userid) + ' AND `ended` = 1 ORDER BY `id` DESC LIMIT 10', function(err7, row7) {
                                if(err7) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering user tower games history page (7)' });

                                var pages = Math.ceil(row6[0].count / 10);

                                res.render('userGamesTower', {
                                    page: 'user',
                                    name: config.app.pages['user'],
                                    response: {
                                        user: {
                                            user: {
                                                userid: row1[0].userid,
                                                name: row1[0].name,
                                                avatar: row1[0].avatar,
                                                rank: config.app.ranks[row1[0].rank],
                                                level: {
                                                    ...level,
                                                    ...{
                                                        tier: [ 'steel', 'bronze', 'silver', 'gold', 'diamond' ][Math.floor(level.level / 25)],
                                                        progress: roundedToFixed((level.have - level.start) / (level.next - level.start) * 100, 2).toFixed(2)
                                                    }
                                                },
                                                created: makeDate(new Date(row1[0].time_create * 1000))
                                            },
                                            stats: {
                                                deposited: getFormatAmountString(row2[0].deposited),
                                                withdrawn: getFormatAmountString(row3[0].withdrawn),
                                                wagered: getFormatAmountString(row4[0].wagered),
                                                profit: getFormatAmountString(getFormatAmount(row5[0].winnings) - getFormatAmount(row4[0].wagered))
                                            },
                                            games: {
                                                game: 'tower',
                                                list: row7.map(function(item){
                                                    var amount = getFormatAmount(item.amount);
                                                    var winnings = getFormatAmount(item.winning);

                                                    var profit = getFormatAmount(winnings - amount);

                                                    return {
                                                        id: item.id,
                                                        difficulty: item.difficulty,
                                                        amount: getFormatAmountString(amount),
                                                        profit: getFormatAmountString(profit),
                                                        status: profit > 0 ? 'win': 'loss',
                                                        date: makeDate(new Date(item.time * 1000))
                                                    };
                                                }),
                                                pages: pages > 0 ? pages : 1,
                                                page: 1
                                            }
                                        }
                                    }
                                });
                            });
                        });
                    });
                });
            });
        });
    });
};

exports.userGamesMinesweeper = async (req, res, next) => {
    if(!haveRankPermission('view_user', res.locals.user ? res.locals.user.rank : 0)) return next();

    var userid = req.params.userid;

    pool.query('SELECT `userid`, `name`, `avatar`, `xp`, `time_create` FROM `users` WHERE `userid` = ' + pool.escape(userid), function(err1, row1) {
        if(err1) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering user minesweeper games history page page (1)' });

        if(row1.length <= 0) return next();

        var level = calculateLevel(row1[0].xp);

        //DEPOSITED
        pool.query('SELECT SUM(`amount`) AS `deposited` FROM `users_trades` WHERE `userid` = ' + pool.escape(row1[0].userid) + ' AND `type` = "deposit"', function(err2, row2) {
            if(err2) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering user minesweeper games history page page (2)' });

            //WITHDRAWN
            pool.query('SELECT SUM(`amount`) AS `withdrawn` FROM `users_trades` WHERE `userid` = ' + pool.escape(row1[0].userid) + ' AND `type` = "withdraw"', function(err3, row3) {
                if(err3) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering user minesweeper games history page page (3)' });

                //WAGERED
                pool.query('SELECT -SUM(`amount`) AS `wagered` FROM `users_transactions` WHERE (' + [ ...Object.keys(config.settings.games.games.original), ...Object.keys(config.settings.games.games.classic) ].map(a => '`service` LIKE "' + a + '_%"').join(' OR ') + ') AND `userid` = ' + pool.escape(row1[0].userid) + ' AND `amount` < 0', function(err4, row4) {
                    if(err4) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering user minesweeper games history page page (4)' });

                    //WINNINGS
                    pool.query('SELECT SUM(`amount`) AS `winnings` FROM `users_transactions` WHERE (' + [ ...Object.keys(config.settings.games.games.original), ...Object.keys(config.settings.games.games.classic) ].map(a => '`service` LIKE "' + a + '_%"').join(' OR ') + ') AND `userid` = ' + pool.escape(row1[0].userid) + ' AND `amount` > 0', function(err5, row5) {
                        if(err5) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering user minesweeper games history page page (5)' });

                        //MINESWEEPER HISTORY
                        pool.query('SELECT COUNT(*) AS `count` FROM `minesweeper_bets` WHERE `userid` = ' + pool.escape(row1[0].userid) + ' AND `ended` = 1', function(err6, row6) {
                            if(err6) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering user minesweeper games history page (6)' });

                            pool.query('SELECT `id`, `amount`, `winning`, `bombs`, `time` FROM `minesweeper_bets` WHERE `userid` = ' + pool.escape(row1[0].userid) + ' AND `ended` = 1 ORDER BY `id` DESC LIMIT 10', function(err7, row7) {
                                if(err7) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering user minesweeper games history page (7)' });

                                var pages = Math.ceil(row6[0].count / 10);

                                res.render('userGamesMinesweeper', {
                                    page: 'user',
                                    name: config.app.pages['user'],
                                    response: {
                                        user: {
                                            user: {
                                                userid: row1[0].userid,
                                                name: row1[0].name,
                                                avatar: row1[0].avatar,
                                                rank: config.app.ranks[row1[0].rank],
                                                level: {
                                                    ...level,
                                                    ...{
                                                        tier: [ 'steel', 'bronze', 'silver', 'gold', 'diamond' ][Math.floor(level.level / 25)],
                                                        progress: roundedToFixed((level.have - level.start) / (level.next - level.start) * 100, 2).toFixed(2)
                                                    }
                                                },
                                                created: makeDate(new Date(row1[0].time_create * 1000))
                                            },
                                            stats: {
                                                deposited: getFormatAmountString(row2[0].deposited),
                                                withdrawn: getFormatAmountString(row3[0].withdrawn),
                                                wagered: getFormatAmountString(row4[0].wagered),
                                                profit: getFormatAmountString(getFormatAmount(row5[0].winnings) - getFormatAmount(row4[0].wagered))
                                            },
                                            games: {
                                                game: 'minesweeper',
                                                list: row7.map(function(item){
                                                    var amount = getFormatAmount(item.amount);
                                                    var winnings = getFormatAmount(item.winning);

                                                    var profit = getFormatAmount(winnings - amount);

                                                    return {
                                                        id: item.id,
                                                        bombs: item.bombs,
                                                        amount: getFormatAmountString(amount),
                                                        profit: getFormatAmountString(profit),
                                                        status: profit > 0 ? 'win': 'loss',
                                                        date: makeDate(new Date(item.time * 1000))
                                                    };
                                                }),
                                                pages: pages > 0 ? pages : 1,
                                                page: 1
                                            }
                                        }
                                    }
                                });
                            });
                        });
                    });
                });
            });
        });
    });
};

exports.userGamesCasino = async (req, res, next) => {
    if(!haveRankPermission('view_user', res.locals.user ? res.locals.user.rank : 0)) return next();

    var userid = req.params.userid;

    pool.query('SELECT `userid`, `name`, `avatar`, `xp`, `time_create` FROM `users` WHERE `userid` = ' + pool.escape(userid), function(err1, row1) {
        if(err1) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering user casino games history page (1)' });

        if(row1.length <= 0) return next();

        var level = calculateLevel(row1[0].xp);

        //DEPOSITED
        pool.query('SELECT SUM(`amount`) AS `deposited` FROM `users_trades` WHERE `userid` = ' + pool.escape(row1[0].userid) + ' AND `type` = "deposit"', function(err2, row2) {
            if(err2) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering user casino games history page (2)' });

            //WITHDRAWN
            pool.query('SELECT SUM(`amount`) AS `withdrawn` FROM `users_trades` WHERE `userid` = ' + pool.escape(row1[0].userid) + ' AND `type` = "withdraw"', function(err3, row3) {
                if(err3) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering user casino games history page (3)' });

                //WAGERED
                pool.query('SELECT -SUM(`amount`) AS `wagered` FROM `users_transactions` WHERE (' + [ ...Object.keys(config.settings.games.games.original), ...Object.keys(config.settings.games.games.classic) ].map(a => '`service` LIKE "' + a + '_%"').join(' OR ') + ') AND `userid` = ' + pool.escape(row1[0].userid) + ' AND `amount` < 0', function(err4, row4) {
                    if(err4) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering user casino games history page (4)' });

                    //WINNINGS
                    pool.query('SELECT SUM(`amount`) AS `winnings` FROM `users_transactions` WHERE (' + [ ...Object.keys(config.settings.games.games.original), ...Object.keys(config.settings.games.games.classic) ].map(a => '`service` LIKE "' + a + '_%"').join(' OR ') + ') AND `userid` = ' + pool.escape(row1[0].userid) + ' AND `amount` > 0', function(err5, row5) {
                        if(err5) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering user casino games history page (5)' });

                        //CASINO HISTORY
                        pool.query('SELECT COUNT(*) AS `count` FROM `casino_bets` LEFT JOIN `casino_winnings` ON casino_bets.id = casino_winnings.betid WHERE casino_bets.userid = ' + pool.escape(row1[0].userid), function(err6, row6) {
                            if(err5) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering user casino games history page (6)' });

                            pool.query('SELECT casino_bets.id, casino_bets.amount, COALESCE(casino_winnings.amount, 0) AS `winnings`, casino_bets.game, casino_bets.time FROM `casino_bets` LEFT JOIN `casino_winnings` ON casino_bets.id = casino_winnings.betid WHERE casino_bets.userid = ' + pool.escape(row1[0].userid) + ' ORDER BY casino_bets.id DESC LIMIT 10', function(err7, row7) {
                                if(err6) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering user casino games history page (7)' });

                                var pages = Math.ceil(row6[0].count / 10);

                                res.render('userGamesCasino', {
                                    page: 'user',
                                    name: config.app.pages['user'],
                                    response: {
                                        user: {
                                            user: {
                                                userid: row1[0].userid,
                                                name: row1[0].name,
                                                avatar: row1[0].avatar,
                                                rank: config.app.ranks[row1[0].rank],
                                                level: {
                                                    ...level,
                                                    ...{
                                                        tier: [ 'steel', 'bronze', 'silver', 'gold', 'diamond' ][Math.floor(level.level / 25)],
                                                        progress: roundedToFixed((level.have - level.start) / (level.next - level.start) * 100, 2).toFixed(2)
                                                    }
                                                },
                                                created: makeDate(new Date(row1[0].time_create * 1000))
                                            },
                                            stats: {
                                                deposited: getFormatAmountString(row2[0].deposited),
                                                withdrawn: getFormatAmountString(row3[0].withdrawn),
                                                wagered: getFormatAmountString(row4[0].wagered),
                                                profit: getFormatAmountString(getFormatAmount(row5[0].winnings) - getFormatAmount(row4[0].wagered))
                                            },
                                            games: {
                                                game: 'casino',
                                                list: row7.map(function(item){
                                                    var amount = getFormatAmount(item.amount);
                                                    var winnings = getFormatAmount(item.winnings);

                                                    var profit = getFormatAmount(winnings - amount);

                                                    return {
                                                        id: item.id,
                                                        game: item.game,
                                                        amount: getFormatAmountString(amount),
                                                        profit: getFormatAmountString(profit),
                                                        status: profit > 0 ? 'win': 'loss',
                                                        date: makeDate(new Date(item.time * 1000))
                                                    };
                                                }),
                                                pages: pages > 0 ? pages : 1,
                                                page: 1
                                            }
                                        }
                                    }
                                });
                            });
                        });
                    });
                });
            });
        });
    });
};

exports.userTransactions = async (req, res, next) => {
    if(!haveRankPermission('view_user', res.locals.user ? res.locals.user.rank : 0)) return next();

    var userid = req.params.userid;

    pool.query('SELECT `userid`, `name`, `avatar`, `xp`, `time_create` FROM `users` WHERE `userid` = ' + pool.escape(userid), function(err1, row1) {
        if(err1) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering user transactions page (1)' });

        if(row1.length <= 0) return next();

        var level = calculateLevel(row1[0].xp);

        //DEPOSITED
        pool.query('SELECT SUM(`amount`) AS `deposited` FROM `users_trades` WHERE `userid` = ' + pool.escape(row1[0].userid) + ' AND `type` = "deposit"', function(err2, row2) {
            if(err2) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering user transactions page (2)' });

            //WITHDRAWN
            pool.query('SELECT SUM(`amount`) AS `withdrawn` FROM `users_trades` WHERE `userid` = ' + pool.escape(row1[0].userid) + ' AND `type` = "withdraw"', function(err3, row3) {
                if(err3) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering user transactions page (3)' });

                //WAGERED
                pool.query('SELECT -SUM(`amount`) AS `wagered` FROM `users_transactions` WHERE (' + [ ...Object.keys(config.settings.games.games.original), ...Object.keys(config.settings.games.games.classic) ].map(a => '`service` LIKE "' + a + '_%"').join(' OR ') + ') AND `userid` = ' + pool.escape(row1[0].userid) + ' AND `amount` < 0', function(err4, row4) {
                    if(err4) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering user transactions page (4)' });

                    //WINNINGS
                    pool.query('SELECT SUM(`amount`) AS `winnings` FROM `users_transactions` WHERE (' + [ ...Object.keys(config.settings.games.games.original), ...Object.keys(config.settings.games.games.classic) ].map(a => '`service` LIKE "' + a + '_%"').join(' OR ') + ') AND `userid` = ' + pool.escape(row1[0].userid) + ' AND `amount` > 0', function(err5, row5) {
                        if(err5) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering user transactions page (5)' });

                        //TRANSACTIONS
                        pool.query('SELECT COUNT(*) AS `count` FROM `users_transactions` WHERE `userid` = ' + pool.escape(row1[0].userid), function(err6, row6){
                            if(err6) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering user transactions page (6)' });

                            pool.query('SELECT `id`, `service`, `amount`, `time` FROM `users_transactions` WHERE `userid` = ' + pool.escape(row1[0].userid) + ' ORDER BY `id` DESC LIMIT 10', function(err7, row7){
                                if(err7) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering user transactions page (7)' });

                                var pages = Math.ceil(row6[0].count / 10);

                                res.render('userTransactions', {
                                    page: 'user',
                                    name: config.app.pages['user'],
                                    response: {
                                        user: {
                                            user: {
                                                userid: row1[0].userid,
                                                name: row1[0].name,
                                                avatar: row1[0].avatar,
                                                rank: config.app.ranks[row1[0].rank],
                                                level: {
                                                    ...level,
                                                    ...{
                                                        tier: [ 'steel', 'bronze', 'silver', 'gold', 'diamond' ][Math.floor(level.level / 25)],
                                                        progress: roundedToFixed((level.have - level.start) / (level.next - level.start) * 100, 2).toFixed(2)
                                                    }
                                                },
                                                created: makeDate(new Date(row1[0].time_create * 1000))
                                            },
                                            stats: {
                                                deposited: getFormatAmountString(row2[0].deposited),
                                                withdrawn: getFormatAmountString(row3[0].withdrawn),
                                                wagered: getFormatAmountString(row4[0].wagered),
                                                profit: getFormatAmountString(getFormatAmount(row5[0].winnings) - getFormatAmount(row4[0].wagered))
                                            },
                                            transactions: {
                                                list: row7.map(a => ({
                                                    id: a.id,
                                                    service: a.service,
                                                    amount: getFormatAmountString(a.amount),
                                                    date: makeDate(new Date(a.time * 1000))
                                                })),
                                                pages: pages > 0 ? pages : 1,
                                                page: 1
                                            }
                                        }
                                    }
                                });
                            });
                        });
                    });
                });
            });
        });
    });
};