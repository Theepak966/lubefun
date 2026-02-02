var crypto = require('crypto');

var { pool } = require('@/lib/database.js');

var { calculateLevel, getUserDevice } = require('@/utils/utils.js');
var { roundedToFixed, getFormatAmount, getFormatAmountString } = require('@/utils/formatAmount.js');
var { makeDate, time } = require('@/utils/formatDate.js');

var config = require('@/config/config.js');

exports.accountUnset = async (req, res, next) => {
    res.redirect('/account/settings');
};

exports.accountSettings = async (req, res, next) => {
    if(!res.locals.user) return res.redirect('/login?returnUrl=/account/settings');

    var level = calculateLevel(res.locals.user.xp);

    //DEPOSITED
    pool.query('SELECT SUM(`amount`) AS `deposited` FROM `users_trades` WHERE `userid` = ' + pool.escape(res.locals.user.userid) + ' AND `type` = "deposit"', function(err1, row1) {
        if(err1) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account settings page (1)' });

        //WITHDRAWN
        pool.query('SELECT SUM(`amount`) AS `withdrawn` FROM `users_trades` WHERE `userid` = ' + pool.escape(res.locals.user.userid) + ' AND `type` = "withdraw"', function(err2, row2) {
            if(err2) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account settings page (2)' });

            //WAGERED
            pool.query('SELECT -SUM(`amount`) AS `wagered` FROM `users_transactions` WHERE (' + [ ...Object.keys(config.settings.games.games.original), ...Object.keys(config.settings.games.games.classic) ].map(a => '`service` LIKE "' + a + '_%"').join(' OR ') + ') AND `userid` = ' + pool.escape(res.locals.user.userid) + ' AND `amount` < 0', function(err3, row3) {
                if(err3) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account settings page (3)' });

                //WINNINGS
                pool.query('SELECT SUM(`amount`) AS `winnings` FROM `users_transactions` WHERE (' + [ ...Object.keys(config.settings.games.games.original), ...Object.keys(config.settings.games.games.classic) ].map(a => '`service` LIKE "' + a + '_%"').join(' OR ') + ') AND `userid` = ' + pool.escape(res.locals.user.userid) + ' AND `amount` > 0', function(err4, row4) {
                    if(err4) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account settings page (4)' });

                    //BINDS
                    pool.query('SELECT `bind` FROM `users_binds` WHERE `removed` = 0 AND `userid` = ' + pool.escape(res.locals.user.userid), function(err5, row5) {
                        if(err5) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account settings page (5)' });

                        res.render('accountSettings', {
                            page: 'account',
                            name: config.app.pages['account'],
                            response: {
                                account: {
                                    user: {
                                        userid: res.locals.user.userid,
                                        name: res.locals.user.name,
                                        avatar: res.locals.user.avatar,
                                        rank: config.app.ranks[res.locals.user.rank],
                                        level: {
                                            ...level,
                                            ...{
                                                tier: [ 'steel', 'bronze', 'silver', 'gold', 'diamond' ][Math.floor(level.level / 25)],
                                                progress: roundedToFixed((level.have - level.start) / (level.next - level.start) * 100, 2).toFixed(2)
                                            }
                                        },
                                        created: makeDate(new Date(res.locals.user.time_create * 1000))
                                    },
                                    stats: {
                                        deposited: getFormatAmountString(row1[0].deposited),
                                        withdrawn: getFormatAmountString(row2[0].withdrawn),
                                        wagered: getFormatAmountString(row3[0].wagered),
                                        profit: getFormatAmountString(getFormatAmount(row4[0].winnings) - getFormatAmount(row3[0].wagered))
                                    },
                                    settings: {

                                        binds: {
                                            value: {
                                                ...Object.keys(config.settings.server.binds).reduce((acc, cur) => ({ ...acc, [cur]: false }), {}),
                                                ...row5.reduce((acc, cur) => ({ ...acc, [cur.bind]: true }), {})
                                            },
                                            enable: config.settings.server.binds
                                        }
                                    }
                                }
                            }
                        });
                    });
                });
            });
        });
    });
};

exports.accountDeposits = async (req, res, next) => {
    if(!res.locals.user) return res.redirect('/login?returnUrl=/account/deposits');

    var level = calculateLevel(res.locals.user.xp);

    //DEPOSITED
    pool.query('SELECT SUM(`amount`) AS `deposited` FROM `users_trades` WHERE `userid` = ' + pool.escape(res.locals.user.userid) + ' AND `type` = "deposit"', function(err1, row1) {
        if(err1) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account deposits page (1)' });

        //WITHDRAWN
        pool.query('SELECT SUM(`amount`) AS `withdrawn` FROM `users_trades` WHERE `userid` = ' + pool.escape(res.locals.user.userid) + ' AND `type` = "withdraw"', function(err2, row2) {
            if(err2) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account deposits page (2)' });

            //WAGERED
            pool.query('SELECT -SUM(`amount`) AS `wagered` FROM `users_transactions` WHERE (' + [ ...Object.keys(config.settings.games.games.original), ...Object.keys(config.settings.games.games.classic) ].map(a => '`service` LIKE "' + a + '_%"').join(' OR ') + ') AND `userid` = ' + pool.escape(res.locals.user.userid) + ' AND `amount` < 0', function(err3, row3) {
                if(err3) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account deposits page (3)' });

                //WINNINGS
                pool.query('SELECT SUM(`amount`) AS `winnings` FROM `users_transactions` WHERE (' + [ ...Object.keys(config.settings.games.games.original), ...Object.keys(config.settings.games.games.classic) ].map(a => '`service` LIKE "' + a + '_%"').join(' OR ') + ') AND `userid` = ' + pool.escape(res.locals.user.userid) + ' AND `amount` > 0', function(err4, row4) {
                    if(err4) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account deposits page (4)' });

                    //DEPOSIT TRANSACTIONS
                    pool.query([
                            'SELECT COUNT(*) AS `count` FROM `crypto_transactions` WHERE `userid` = ' + pool.escape(res.locals.user.userid) + ' AND `type` = "deposit"'
                        ].join(' UNION ALL '), function(err5, row5) {
                        if(err5) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account deposits page (5)' });

                        pool.query([
                                'SELECT `transactionid` AS `id`, `status`, `amount`, `paid` * `exchange` AS `paid`, "crypto" AS `method`, `currency` AS `game`, `time` FROM `crypto_transactions` WHERE `userid` = ' + pool.escape(res.locals.user.userid) + ' AND `type` = "deposit"'
                            ].join(' UNION ALL ') + ' ORDER BY `time` DESC LIMIT 10', function(err6, row6) {
			                if(err6) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account deposits page (6)' });

                            var pages = Math.ceil(row5.reduce((acc, cur) => acc + cur.count, 0) / 10);

                            res.render('accountDeposits', {
                                page: 'account',
                                name: config.app.pages['account'],
                                response: {
                                    account: {
                                        user: {
                                            userid: res.locals.user.userid,
                                            name: res.locals.user.name,
                                            avatar: res.locals.user.avatar,
                                            rank: config.app.ranks[res.locals.user.rank],
                                            level: {
                                                ...level,
                                                ...{
                                                    tier: [ 'steel', 'bronze', 'silver', 'gold', 'diamond' ][Math.floor(level.level / 25)],
                                                    progress: roundedToFixed((level.have - level.start) / (level.next - level.start) * 100, 2).toFixed(2)
                                                }
                                            },
                                            created: makeDate(new Date(res.locals.user.time_create * 1000))
                                        },
                                        stats: {
                                            deposited: getFormatAmountString(row1[0].deposited),
                                            withdrawn: getFormatAmountString(row2[0].withdrawn),
                                            wagered: getFormatAmountString(row3[0].wagered),
                                            profit: getFormatAmountString(getFormatAmount(row4[0].winnings) - getFormatAmount(row3[0].wagered))
                                        },
                                        deposits: {
                                            list: row6.map(function(item){
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
};

exports.accountWithdrawals = async (req, res, next) => {
    if(!res.locals.user) return res.redirect('/login?returnUrl=/account/withdrawals');

    var level = calculateLevel(res.locals.user.xp);

    //DEPOSITED
    pool.query('SELECT SUM(`amount`) AS `deposited` FROM `users_trades` WHERE `userid` = ' + pool.escape(res.locals.user.userid) + ' AND `type` = "deposit"', function(err1, row1) {
        if(err1) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account withdrawals page (1)' });

        //WITHDRAWN
        pool.query('SELECT SUM(`amount`) AS `withdrawn` FROM `users_trades` WHERE `userid` = ' + pool.escape(res.locals.user.userid) + ' AND `type` = "withdraw"', function(err2, row2) {
            if(err2) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account withdrawals page (2)' });

            //WAGERED
            pool.query('SELECT -SUM(`amount`) AS `wagered` FROM `users_transactions` WHERE (' + [ ...Object.keys(config.settings.games.games.original), ...Object.keys(config.settings.games.games.classic) ].map(a => '`service` LIKE "' + a + '_%"').join(' OR ') + ') AND `userid` = ' + pool.escape(res.locals.user.userid) + ' AND `amount` < 0', function(err3, row3) {
                if(err3) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account withdrawals page (3)' });

                //WINNINGS
                pool.query('SELECT SUM(`amount`) AS `winnings` FROM `users_transactions` WHERE (' + [ ...Object.keys(config.settings.games.games.original), ...Object.keys(config.settings.games.games.classic) ].map(a => '`service` LIKE "' + a + '_%"').join(' OR ') + ') AND `userid` = ' + pool.escape(res.locals.user.userid) + ' AND `amount` > 0', function(err4, row4) {
                    if(err4) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account withdrawals page (4)' });

                    //WITHDRAW TRANSACTIONS
                    pool.query([
                            'SELECT COUNT(*) AS `count` FROM `crypto_transactions` WHERE `userid` = ' + pool.escape(res.locals.user.userid) + ' AND `type` = "withdraw"'
                        ].join(' UNION ALL '), function(err5, row5) {
                        if(err5) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account withdrawals page (5)' });

                        pool.query([
                                'SELECT `transactionid` AS `id`, `status`, `amount`, "crypto" AS `method`, `currency` AS `game`, `time` FROM `crypto_transactions` WHERE `userid` = ' + pool.escape(res.locals.user.userid) + ' AND `type` = "withdraw"'
                            ].join(' UNION ALL ') + ' ORDER BY `time` DESC LIMIT 10', function(err6, row6) {
                            if(err6) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account withdrawals page (6)' });

                            var pages = Math.ceil(row5.reduce((acc, cur) => acc + cur.count, 0) / 10);

                            res.render('accountWithdrawals', {
                                page: 'account',
                                name: config.app.pages['account'],
                                response: {
                                    account: {
                                        user: {
                                            userid: res.locals.user.userid,
                                            name: res.locals.user.name,
                                            avatar: res.locals.user.avatar,
                                            rank: config.app.ranks[res.locals.user.rank],
                                            level: {
                                                ...level,
                                                ...{
                                                    tier: [ 'steel', 'bronze', 'silver', 'gold', 'diamond' ][Math.floor(level.level / 25)],
                                                    progress: roundedToFixed((level.have - level.start) / (level.next - level.start) * 100, 2).toFixed(2)
                                                }
                                            },
                                            created: makeDate(new Date(res.locals.user.time_create * 1000))
                                        },
                                        stats: {
                                            deposited: getFormatAmountString(row1[0].deposited),
                                            withdrawn: getFormatAmountString(row2[0].withdrawn),
                                            wagered: getFormatAmountString(row3[0].wagered),
                                            profit: getFormatAmountString(getFormatAmount(row4[0].winnings) - getFormatAmount(row3[0].wagered))
                                        },
                                        withdrawals: {
                                            list: row6.map(function(item){
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
};

exports.accountGamesUnset = async (req, res, next) => {
    res.redirect('/account/games/' + [ ...Object.keys(config.settings.games.games.original), ...Object.keys(config.settings.games.games.classic) ][0]);
};

exports.accountGamesCrash = async (req, res, next) => {
    if(!res.locals.user) return res.redirect('/login?returnUrl=/account/games/crash');

    var level = calculateLevel(res.locals.user.xp);

    //DEPOSITED
    pool.query('SELECT SUM(`amount`) AS `deposited` FROM `users_trades` WHERE `userid` = ' + pool.escape(res.locals.user.userid) + ' AND `type` = "deposit"', function(err1, row1) {
        if(err1) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account crash games history page (1)' });

        //WITHDRAWN
        pool.query('SELECT SUM(`amount`) AS `withdrawn` FROM `users_trades` WHERE `userid` = ' + pool.escape(res.locals.user.userid) + ' AND `type` = "withdraw"', function(err2, row2) {
            if(err2) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account crash games history page (2)' });

            //WAGERED
            pool.query('SELECT -SUM(`amount`) AS `wagered` FROM `users_transactions` WHERE (' + [ ...Object.keys(config.settings.games.games.original), ...Object.keys(config.settings.games.games.classic) ].map(a => '`service` LIKE "' + a + '_%"').join(' OR ') + ') AND `userid` = ' + pool.escape(res.locals.user.userid) + ' AND `amount` < 0', function(err3, row3) {
                if(err3) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account crash games history page (3)' });

                //WINNINGS
                pool.query('SELECT SUM(`amount`) AS `winnings` FROM `users_transactions` WHERE (' + [ ...Object.keys(config.settings.games.games.original), ...Object.keys(config.settings.games.games.classic) ].map(a => '`service` LIKE "' + a + '_%"').join(' OR ') + ') AND `userid` = ' + pool.escape(res.locals.user.userid) + ' AND `amount` > 0', function(err4, row4) {
                    if(err4) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account crash games history page (4)' });

                    //CRASH HISTORY
                    pool.query('SELECT COUNT(*) AS `count` FROM `crash_bets` INNER JOIN `crash_rolls` ON crash_bets.gameid = crash_rolls.id WHERE crash_bets.userid = ' + pool.escape(res.locals.user.userid) + ' AND crash_rolls.ended = 1', function(err5, row5) {
                        if(err5) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account crash games history page (5)' });

                        pool.query('SELECT crash_bets.id, crash_bets.amount, crash_bets.cashedout, crash_bets.point, crash_bets.time FROM `crash_bets` INNER JOIN `crash_rolls` ON crash_bets.gameid = crash_rolls.id WHERE crash_bets.userid = ' + pool.escape(res.locals.user.userid) + ' AND crash_rolls.ended = 1 ORDER BY crash_bets.id DESC LIMIT 10', function(err6, row6) {
                            if(err6) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account crash games history page (6)' });

                            var pages = Math.ceil(row5[0].count / 10);

                            res.render('accountGamesCrash', {
                                page: 'account',
                                name: config.app.pages['account'],
                                response: {
                                    account: {
                                        user: {
                                            userid: res.locals.user.userid,
                                            name: res.locals.user.name,
                                            avatar: res.locals.user.avatar,
                                            rank: config.app.ranks[res.locals.user.rank],
                                            level: {
                                                ...level,
                                                ...{
                                                    tier: [ 'steel', 'bronze', 'silver', 'gold', 'diamond' ][Math.floor(level.level / 25)],
                                                    progress: roundedToFixed((level.have - level.start) / (level.next - level.start) * 100, 2).toFixed(2)
                                                }
                                            },
                                            created: makeDate(new Date(res.locals.user.time_create * 1000))
                                        },
                                        stats: {
                                            deposited: getFormatAmountString(row1[0].deposited),
                                            withdrawn: getFormatAmountString(row2[0].withdrawn),
                                            wagered: getFormatAmountString(row3[0].wagered),
                                            profit: getFormatAmountString(getFormatAmount(row4[0].winnings) - getFormatAmount(row3[0].wagered))
                                        },
                                        games: {
                                            game: 'crash',
                                            list: row6.map(function(item){
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
};

exports.accountGamesCoinflip = async (req, res, next) => {
    if(!res.locals.user) return res.redirect('/login?returnUrl=/account/games/coinflip');

    var level = calculateLevel(res.locals.user.xp);

    //DEPOSITED
    pool.query('SELECT SUM(`amount`) AS `deposited` FROM `users_trades` WHERE `userid` = ' + pool.escape(res.locals.user.userid) + ' AND `type` = "deposit"', function(err1, row1) {
        if(err1) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account coinflip games history page (1)' });

        //WITHDRAWN
        pool.query('SELECT SUM(`amount`) AS `withdrawn` FROM `users_trades` WHERE `userid` = ' + pool.escape(res.locals.user.userid) + ' AND `type` = "withdraw"', function(err2, row2) {
            if(err2) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account coinflip games history page (2)' });

            //WAGERED
            pool.query('SELECT -SUM(`amount`) AS `wagered` FROM `users_transactions` WHERE (' + [ ...Object.keys(config.settings.games.games.original), ...Object.keys(config.settings.games.games.classic) ].map(a => '`service` LIKE "' + a + '_%"').join(' OR ') + ') AND `userid` = ' + pool.escape(res.locals.user.userid) + ' AND `amount` < 0', function(err3, row3) {
                if(err3) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account coinflip games history page (3)' });

                //WINNINGS
                pool.query('SELECT SUM(`amount`) AS `winnings` FROM `users_transactions` WHERE (' + [ ...Object.keys(config.settings.games.games.original), ...Object.keys(config.settings.games.games.classic) ].map(a => '`service` LIKE "' + a + '_%"').join(' OR ') + ') AND `userid` = ' + pool.escape(res.locals.user.userid) + ' AND `amount` > 0', function(err4, row4) {
                    if(err4) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account coinflip games history page (4)' });

                    //COINFLIP HISTORY
                    pool.query('SELECT COUNT(*) AS `count` FROM `coinflip_bets` INNER JOIN `coinflip_games` ON coinflip_bets.gameid = coinflip_games.id INNER JOIN `coinflip_rolls` ON coinflip_games.id = coinflip_rolls.gameid INNER JOIN `coinflip_winnings` ON coinflip_games.id = coinflip_winnings.gameid WHERE coinflip_bets.userid = ' + pool.escape(res.locals.user.userid) + ' AND coinflip_games.ended = 1 AND coinflip_rolls.removed = 0', function(err5, row5) {
                        if(err5) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account coinflip games history page (5)' });

                        pool.query('SELECT coinflip_bets.id, IF(coinflip_bets.position = coinflip_winnings.position, 1, 0) AS `status`, coinflip_games.amount, coinflip_winnings.amount AS `winnings`, coinflip_bets.time FROM `coinflip_bets` INNER JOIN `coinflip_games` ON coinflip_bets.gameid = coinflip_games.id INNER JOIN `coinflip_rolls` ON coinflip_games.id = coinflip_rolls.gameid INNER JOIN `coinflip_winnings` ON coinflip_games.id = coinflip_winnings.gameid WHERE coinflip_bets.userid = ' + pool.escape(res.locals.user.userid) + ' AND coinflip_games.ended = 1 AND coinflip_rolls.removed = 0 ORDER BY coinflip_bets.id DESC LIMIT 10', function(err6, row6) {
                            if(err6) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account coinflip games history page (6)' });

                            var pages = Math.ceil(row5[0].count / 10);

                            res.render('accountGamesCoinflip', {
                                page: 'account',
                                name: config.app.pages['account'],
                                response: {
                                    account: {
                                        user: {
                                            userid: res.locals.user.userid,
                                            name: res.locals.user.name,
                                            avatar: res.locals.user.avatar,
                                            rank: config.app.ranks[res.locals.user.rank],
                                            level: {
                                                ...level,
                                                ...{
                                                    tier: [ 'steel', 'bronze', 'silver', 'gold', 'diamond' ][Math.floor(level.level / 25)],
                                                    progress: roundedToFixed((level.have - level.start) / (level.next - level.start) * 100, 2).toFixed(2)
                                                }
                                            },
                                            created: makeDate(new Date(res.locals.user.time_create * 1000))
                                        },
                                        stats: {
                                            deposited: getFormatAmountString(row1[0].deposited),
                                            withdrawn: getFormatAmountString(row2[0].withdrawn),
                                            wagered: getFormatAmountString(row3[0].wagered),
                                            profit: getFormatAmountString(getFormatAmount(row4[0].winnings) - getFormatAmount(row3[0].wagered))
                                        },
                                        games: {
                                            game: 'coinflip',
                                            list: row6.map(function(item){
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
};

exports.accountGamesBlackjack = async (req, res, next) => {
    if(!res.locals.user) return res.redirect('/login?returnUrl=/account/games/blackjack');

    var level = calculateLevel(res.locals.user.xp);

    //DEPOSITED
    pool.query('SELECT SUM(`amount`) AS `deposited` FROM `users_trades` WHERE `userid` = ' + pool.escape(res.locals.user.userid) + ' AND `type` = "deposit"', function(err1, row1) {
        if(err1) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account blackjack games history page (1)' });

        //WITHDRAWN
        pool.query('SELECT SUM(`amount`) AS `withdrawn` FROM `users_trades` WHERE `userid` = ' + pool.escape(res.locals.user.userid) + ' AND `type` = "withdraw"', function(err2, row2) {
            if(err2) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account blackjack games history page (2)' });

            //WAGERED
            pool.query('SELECT -SUM(`amount`) AS `wagered` FROM `users_transactions` WHERE (' + [ ...Object.keys(config.settings.games.games.original), ...Object.keys(config.settings.games.games.classic) ].map(a => '`service` LIKE "' + a + '_%"').join(' OR ') + ') AND `userid` = ' + pool.escape(res.locals.user.userid) + ' AND `amount` < 0', function(err3, row3) {
                if(err3) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account blackjack games history page (3)' });

                //WINNINGS
                pool.query('SELECT SUM(`amount`) AS `winnings` FROM `users_transactions` WHERE (' + [ ...Object.keys(config.settings.games.games.original), ...Object.keys(config.settings.games.games.classic) ].map(a => '`service` LIKE "' + a + '_%"').join(' OR ') + ') AND `userid` = ' + pool.escape(res.locals.user.userid) + ' AND `amount` > 0', function(err4, row4) {
                    if(err4) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account blackjack games history page (4)' });

                    //BLACKJACK HISTORY
                    pool.query('SELECT COUNT(*) AS `count` FROM `blackjack_bets` WHERE `userid` = ' + pool.escape(res.locals.user.userid) + ' AND `ended` = 1', function(err5, row5) {
                        if(err5) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account blackjack games history page (5)' });

                        pool.query('SELECT `id`, `amount`, `winning`, `result`, `time` FROM `blackjack_bets` WHERE `userid` = ' + pool.escape(res.locals.user.userid) + ' AND `ended` = 1 ORDER BY `id` DESC LIMIT 10', function(err6, row6) {
                            if(err6) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account blackjack games history page (6)' });

                            var pages = Math.ceil(row5[0].count / 10);

                            res.render('accountGamesBlackjack', {
                                page: 'account',
                                name: config.app.pages['account'],
                                response: {
                                    account: {
                                        user: {
                                            userid: res.locals.user.userid,
                                            name: res.locals.user.name,
                                            avatar: res.locals.user.avatar,
                                            rank: config.app.ranks[res.locals.user.rank],
                                            level: {
                                                ...level,
                                                ...{
                                                    tier: [ 'steel', 'bronze', 'silver', 'gold', 'diamond' ][Math.floor(level.level / 25)],
                                                    progress: roundedToFixed((level.have - level.start) / (level.next - level.start) * 100, 2).toFixed(2)
                                                }
                                            },
                                            created: makeDate(new Date(res.locals.user.time_create * 1000))
                                        },
                                        stats: {
                                            deposited: getFormatAmountString(row1[0].deposited),
                                            withdrawn: getFormatAmountString(row2[0].withdrawn),
                                            wagered: getFormatAmountString(row3[0].wagered),
                                            profit: getFormatAmountString(getFormatAmount(row4[0].winnings) - getFormatAmount(row3[0].wagered))
                                        },
                                        games: {
                                            game: 'blackjack',
                                            list: row6.map(function(item){
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
};

exports.accountGamesTower = async (req, res, next) => {
    if(!res.locals.user) return res.redirect('/login?returnUrl=/account/games/tower');

    var level = calculateLevel(res.locals.user.xp);

    //DEPOSITED
    pool.query('SELECT SUM(`amount`) AS `deposited` FROM `users_trades` WHERE `userid` = ' + pool.escape(res.locals.user.userid) + ' AND `type` = "deposit"', function(err1, row1) {
        if(err1) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account tower games history page (1)' });

        //WITHDRAWN
        pool.query('SELECT SUM(`amount`) AS `withdrawn` FROM `users_trades` WHERE `userid` = ' + pool.escape(res.locals.user.userid) + ' AND `type` = "withdraw"', function(err2, row2) {
            if(err2) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account tower games history page (2)' });

            //WAGERED
            pool.query('SELECT -SUM(`amount`) AS `wagered` FROM `users_transactions` WHERE (' + [ ...Object.keys(config.settings.games.games.original), ...Object.keys(config.settings.games.games.classic) ].map(a => '`service` LIKE "' + a + '_%"').join(' OR ') + ') AND `userid` = ' + pool.escape(res.locals.user.userid) + ' AND `amount` < 0', function(err3, row3) {
                if(err3) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account tower games history page (3)' });

                //WINNINGS
                pool.query('SELECT SUM(`amount`) AS `winnings` FROM `users_transactions` WHERE (' + [ ...Object.keys(config.settings.games.games.original), ...Object.keys(config.settings.games.games.classic) ].map(a => '`service` LIKE "' + a + '_%"').join(' OR ') + ') AND `userid` = ' + pool.escape(res.locals.user.userid) + ' AND `amount` > 0', function(err4, row4) {
                    if(err4) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account tower games history page (4)' });

                    //TOWER HISTORY
                    pool.query('SELECT COUNT(*) AS `count` FROM `tower_bets` WHERE `userid` = ' + pool.escape(res.locals.user.userid) + ' AND `ended` = 1', function(err5, row5) {
                        if(err5) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account tower games history page (5)' });

                        pool.query('SELECT `id`, `amount`, `winning`, `difficulty`, `time` FROM `tower_bets` WHERE `userid` = ' + pool.escape(res.locals.user.userid) + ' AND `ended` = 1 ORDER BY `id` DESC LIMIT 10', function(err6, row6) {
                            if(err6) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account tower games history page (6)' });

                            var pages = Math.ceil(row5[0].count / 10);

                            res.render('accountGamesTower', {
                                page: 'account',
                                name: config.app.pages['account'],
                                response: {
                                    account: {
                                        user: {
                                            userid: res.locals.user.userid,
                                            name: res.locals.user.name,
                                            avatar: res.locals.user.avatar,
                                            rank: config.app.ranks[res.locals.user.rank],
                                            level: {
                                                ...level,
                                                ...{
                                                    tier: [ 'steel', 'bronze', 'silver', 'gold', 'diamond' ][Math.floor(level.level / 25)],
                                                    progress: roundedToFixed((level.have - level.start) / (level.next - level.start) * 100, 2).toFixed(2)
                                                }
                                            },
                                            created: makeDate(new Date(res.locals.user.time_create * 1000))
                                        },
                                        stats: {
                                            deposited: getFormatAmountString(row1[0].deposited),
                                            withdrawn: getFormatAmountString(row2[0].withdrawn),
                                            wagered: getFormatAmountString(row3[0].wagered),
                                            profit: getFormatAmountString(getFormatAmount(row4[0].winnings) - getFormatAmount(row3[0].wagered))
                                        },
                                        games: {
                                            game: 'tower',
                                            list: row6.map(function(item){
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
};

exports.accountGamesMinesweeper = async (req, res, next) => {
    if(!res.locals.user) return res.redirect('/login?returnUrl=/account/games/minesweeper');

    var level = calculateLevel(res.locals.user.xp);

    //DEPOSITED
    pool.query('SELECT SUM(`amount`) AS `deposited` FROM `users_trades` WHERE `userid` = ' + pool.escape(res.locals.user.userid) + ' AND `type` = "deposit"', function(err1, row1) {
        if(err1) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account minesweeper games history page (1)' });

        //WITHDRAWN
        pool.query('SELECT SUM(`amount`) AS `withdrawn` FROM `users_trades` WHERE `userid` = ' + pool.escape(res.locals.user.userid) + ' AND `type` = "withdraw"', function(err2, row2) {
            if(err2) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account minesweeper games history page (2)' });

            //WAGERED
            pool.query('SELECT -SUM(`amount`) AS `wagered` FROM `users_transactions` WHERE (' + [ ...Object.keys(config.settings.games.games.original), ...Object.keys(config.settings.games.games.classic) ].map(a => '`service` LIKE "' + a + '_%"').join(' OR ') + ') AND `userid` = ' + pool.escape(res.locals.user.userid) + ' AND `amount` < 0', function(err3, row3) {
                if(err3) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account minesweeper games history page (3)' });

                //WINNINGS
                pool.query('SELECT SUM(`amount`) AS `winnings` FROM `users_transactions` WHERE (' + [ ...Object.keys(config.settings.games.games.original), ...Object.keys(config.settings.games.games.classic) ].map(a => '`service` LIKE "' + a + '_%"').join(' OR ') + ') AND `userid` = ' + pool.escape(res.locals.user.userid) + ' AND `amount` > 0', function(err4, row4) {
                    if(err4) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account minesweeper games history page (4)' });

                    //MINESWEEPER HISTORY
                    pool.query('SELECT COUNT(*) AS `count` FROM `minesweeper_bets` WHERE `userid` = ' + pool.escape(res.locals.user.userid) + ' AND `ended` = 1', function(err5, row5) {
                        if(err5) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account minesweeper games history page (5)' });

                        pool.query('SELECT `id`, `amount`, `winning`, `bombs`, `time` FROM `minesweeper_bets` WHERE `userid` = ' + pool.escape(res.locals.user.userid) + ' AND `ended` = 1 ORDER BY `id` DESC LIMIT 10', function(err6, row6) {
                            if(err6) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account minesweeper games history page (6)' });

                            var pages = Math.ceil(row5[0].count / 10);

                            res.render('accountGamesMinesweeper', {
                                page: 'account',
                                name: config.app.pages['account'],
                                response: {
                                    account: {
                                        user: {
                                            userid: res.locals.user.userid,
                                            name: res.locals.user.name,
                                            avatar: res.locals.user.avatar,
                                            rank: config.app.ranks[res.locals.user.rank],
                                            level: {
                                                ...level,
                                                ...{
                                                    tier: [ 'steel', 'bronze', 'silver', 'gold', 'diamond' ][Math.floor(level.level / 25)],
                                                    progress: roundedToFixed((level.have - level.start) / (level.next - level.start) * 100, 2).toFixed(2)
                                                }
                                            },
                                            created: makeDate(new Date(res.locals.user.time_create * 1000))
                                        },
                                        stats: {
                                            deposited: getFormatAmountString(row1[0].deposited),
                                            withdrawn: getFormatAmountString(row2[0].withdrawn),
                                            wagered: getFormatAmountString(row3[0].wagered),
                                            profit: getFormatAmountString(getFormatAmount(row4[0].winnings) - getFormatAmount(row3[0].wagered))
                                        },
                                        games: {
                                            game: 'minesweeper',
                                            list: row6.map(function(item){
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
};

exports.accountGamesCasino = async (req, res, next) => {
    if(!res.locals.user) return res.redirect('/login?returnUrl=/account/games/casino');

    var level = calculateLevel(res.locals.user.xp);

    //DEPOSITED
    pool.query('SELECT SUM(`amount`) AS `deposited` FROM `users_trades` WHERE `userid` = ' + pool.escape(res.locals.user.userid) + ' AND `type` = "deposit"', function(err1, row1) {
        if(err1) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account casino games history page (1)' });

        //WITHDRAWN
        pool.query('SELECT SUM(`amount`) AS `withdrawn` FROM `users_trades` WHERE `userid` = ' + pool.escape(res.locals.user.userid) + ' AND `type` = "withdraw"', function(err2, row2) {
            if(err2) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account casino games history page (2)' });

            //WAGERED
            pool.query('SELECT -SUM(`amount`) AS `wagered` FROM `users_transactions` WHERE (' + [ ...Object.keys(config.settings.games.games.original), ...Object.keys(config.settings.games.games.classic) ].map(a => '`service` LIKE "' + a + '_%"').join(' OR ') + ') AND `userid` = ' + pool.escape(res.locals.user.userid) + ' AND `amount` < 0', function(err3, row3) {
                if(err3) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account casino games history page (3)' });

                //WINNINGS
                pool.query('SELECT SUM(`amount`) AS `winnings` FROM `users_transactions` WHERE (' + [ ...Object.keys(config.settings.games.games.original), ...Object.keys(config.settings.games.games.classic) ].map(a => '`service` LIKE "' + a + '_%"').join(' OR ') + ') AND `userid` = ' + pool.escape(res.locals.user.userid) + ' AND `amount` > 0', function(err4, row4) {
                    if(err4) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account casino games history page (4)' });

                    //CASINO HISTORY
                    pool.query('SELECT COUNT(*) AS `count` FROM `casino_bets` LEFT JOIN `casino_winnings` ON casino_bets.id = casino_winnings.betid WHERE casino_bets.userid = ' + pool.escape(res.locals.user.userid), function(err5, row5) {
                        if(err5) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account casino games history page (5)' });

                        pool.query('SELECT casino_bets.id, casino_bets.amount, COALESCE(casino_winnings.amount, 0) AS `winnings`, casino_bets.game, casino_bets.time FROM `casino_bets` LEFT JOIN `casino_winnings` ON casino_bets.id = casino_winnings.betid WHERE casino_bets.userid = ' + pool.escape(res.locals.user.userid) + ' ORDER BY casino_bets.id DESC LIMIT 10', function(err6, row6) {
                            if(err6) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account casino games history page (6)' });

                            var pages = Math.ceil(row5[0].count / 10);

                            res.render('accountGamesCasino', {
                                page: 'account',
                                name: config.app.pages['account'],
                                response: {
                                    account: {
                                        user: {
                                            userid: res.locals.user.userid,
                                            name: res.locals.user.name,
                                            avatar: res.locals.user.avatar,
                                            rank: config.app.ranks[res.locals.user.rank],
                                            level: {
                                                ...level,
                                                ...{
                                                    tier: [ 'steel', 'bronze', 'silver', 'gold', 'diamond' ][Math.floor(level.level / 25)],
                                                    progress: roundedToFixed((level.have - level.start) / (level.next - level.start) * 100, 2).toFixed(2)
                                                }
                                            },
                                            created: makeDate(new Date(res.locals.user.time_create * 1000))
                                        },
                                        stats: {
                                            deposited: getFormatAmountString(row1[0].deposited),
                                            withdrawn: getFormatAmountString(row2[0].withdrawn),
                                            wagered: getFormatAmountString(row3[0].wagered),
                                            profit: getFormatAmountString(getFormatAmount(row4[0].winnings) - getFormatAmount(row3[0].wagered))
                                        },
                                        games: {
                                            game: 'casino',
                                            list: row6.map(function(item){
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
};

exports.accountTransactions = async (req, res, next) => {
    if(!res.locals.user) return res.redirect('/login?returnUrl=/account/transactions');

    var level = calculateLevel(res.locals.user.xp);

    //DEPOSITED
    pool.query('SELECT SUM(`amount`) AS `deposited` FROM `users_trades` WHERE `userid` = ' + pool.escape(res.locals.user.userid) + ' AND `type` = "deposit"', function(err1, row1) {
        if(err1) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account transactions page (1)' });

        //WITHDRAWN
        pool.query('SELECT SUM(`amount`) AS `withdrawn` FROM `users_trades` WHERE `userid` = ' + pool.escape(res.locals.user.userid) + ' AND `type` = "withdraw"', function(err2, row2) {
            if(err2) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account transactions page (2)' });

            //WAGERED
            pool.query('SELECT -SUM(`amount`) AS `wagered` FROM `users_transactions` WHERE (' + [ ...Object.keys(config.settings.games.games.original), ...Object.keys(config.settings.games.games.classic) ].map(a => '`service` LIKE "' + a + '_%"').join(' OR ') + ') AND `userid` = ' + pool.escape(res.locals.user.userid) + ' AND `amount` < 0', function(err3, row3) {
                if(err3) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account transactions page (3)' });

                //WINNINGS
                pool.query('SELECT SUM(`amount`) AS `winnings` FROM `users_transactions` WHERE (' + [ ...Object.keys(config.settings.games.games.original), ...Object.keys(config.settings.games.games.classic) ].map(a => '`service` LIKE "' + a + '_%"').join(' OR ') + ') AND `userid` = ' + pool.escape(res.locals.user.userid) + ' AND `amount` > 0', function(err4, row4) {
                    if(err4) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account transactions page (4)' });

                    //TRANSACTIONS
                    pool.query('SELECT COUNT(*) AS `count` FROM `users_transactions` WHERE `userid` = ' + pool.escape(res.locals.user.userid), function(err5, row5){
                        if(err5) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account transactions page (5)' });

                        pool.query('SELECT `id`, `service`, `amount`, `time` FROM `users_transactions` WHERE `userid` = ' + pool.escape(res.locals.user.userid) + ' ORDER BY `id` DESC LIMIT 10', function(err6, row6){
                            if(err6) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account transactions page (6)' });

                            var pages = Math.ceil(row5[0].count / 10);

                            res.render('accountTransactions', {
                                page: 'account',
                                name: config.app.pages['account'],
                                response: {
                                    account: {
                                        user: {
                                            userid: res.locals.user.userid,
                                            name: res.locals.user.name,
                                            avatar: res.locals.user.avatar,
                                            rank: config.app.ranks[res.locals.user.rank],
                                            level: {
                                                ...level,
                                                ...{
                                                    tier: [ 'steel', 'bronze', 'silver', 'gold', 'diamond' ][Math.floor(level.level / 25)],
                                                    progress: roundedToFixed((level.have - level.start) / (level.next - level.start) * 100, 2).toFixed(2)
                                                }
                                            },
                                            created: makeDate(new Date(res.locals.user.time_create * 1000))
                                        },
                                        stats: {
                                            deposited: getFormatAmountString(row1[0].deposited),
                                            withdrawn: getFormatAmountString(row2[0].withdrawn),
                                            wagered: getFormatAmountString(row3[0].wagered),
                                            profit: getFormatAmountString(getFormatAmount(row4[0].winnings) - getFormatAmount(row3[0].wagered))
                                        },
                                        transactions: {
                                            list: row6.map(a => ({
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
};

exports.accountExclusion = async (req, res, next) => {
    if(!res.locals.user) return res.redirect('/login?returnUrl=/account/exclusion');

    var level = calculateLevel(res.locals.user.xp);

    //DEPOSITED
    pool.query('SELECT SUM(`amount`) AS `deposited` FROM `users_trades` WHERE `userid` = ' + pool.escape(res.locals.user.userid) + ' AND `type` = "deposit"', function(err1, row1) {
        if(err1) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account exclusion page (1)' });

        //WITHDRAWN
        pool.query('SELECT SUM(`amount`) AS `withdrawn` FROM `users_trades` WHERE `userid` = ' + pool.escape(res.locals.user.userid) + ' AND `type` = "withdraw"', function(err2, row2) {
            if(err2) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account exclusion page (2)' });

            //WAGERED
            pool.query('SELECT -SUM(`amount`) AS `wagered` FROM `users_transactions` WHERE (' + [ ...Object.keys(config.settings.games.games.original), ...Object.keys(config.settings.games.games.classic) ].map(a => '`service` LIKE "' + a + '_%"').join(' OR ') + ') AND `userid` = ' + pool.escape(res.locals.user.userid) + ' AND `amount` < 0', function(err3, row3) {
                if(err3) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account exclusion page (3)' });

                //WINNINGS
                pool.query('SELECT SUM(`amount`) AS `winnings` FROM `users_transactions` WHERE (' + [ ...Object.keys(config.settings.games.games.original), ...Object.keys(config.settings.games.games.classic) ].map(a => '`service` LIKE "' + a + '_%"').join(' OR ') + ') AND `userid` = ' + pool.escape(res.locals.user.userid) + ' AND `amount` > 0', function(err4, row4) {
                    if(err4) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account exclusion page (4)' });

                    res.render('accountExclusion', {
                        page: 'account',
                        name: config.app.pages['account'],
                        response: {
                            account: {
                                user: {
                                    userid: res.locals.user.userid,
                                    name: res.locals.user.name,
                                    avatar: res.locals.user.avatar,
                                    rank: config.app.ranks[res.locals.user.rank],
                                    level: {
                                        ...level,
                                        ...{
                                            tier: [ 'steel', 'bronze', 'silver', 'gold', 'diamond' ][Math.floor(level.level / 25)],
                                            progress: roundedToFixed((level.have - level.start) / (level.next - level.start) * 100, 2).toFixed(2)
                                        }
                                    },
                                    created: makeDate(new Date(res.locals.user.time_create * 1000))
                                },
                                stats: {
                                    deposited: getFormatAmountString(row1[0].deposited),
                                    withdrawn: getFormatAmountString(row2[0].withdrawn),
                                    wagered: getFormatAmountString(row3[0].wagered),
                                    profit: getFormatAmountString(getFormatAmount(row4[0].winnings) - getFormatAmount(row3[0].wagered))
                                },
                                exclusion: {
                                    active: res.locals.user.exclusion > time(),
                                    expire: makeDate(new Date(res.locals.user.exclusion * 1000))
                                }
                            }
                        }
                    });
                });
            });
        });
    });
};

exports.accountSecurity = async (req, res, next) => {
    if(!res.locals.user) return res.redirect('/login?returnUrl=/account/security');

    var level = calculateLevel(res.locals.user.xp);

    //DEPOSITED
    pool.query('SELECT SUM(`amount`) AS `deposited` FROM `users_trades` WHERE `userid` = ' + pool.escape(res.locals.user.userid) + ' AND `type` = "deposit"', function(err1, row1) {
        if(err1) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account security page (1)' });

        //WITHDRAWN
        pool.query('SELECT SUM(`amount`) AS `withdrawn` FROM `users_trades` WHERE `userid` = ' + pool.escape(res.locals.user.userid) + ' AND `type` = "withdraw"', function(err2, row2) {
            if(err2) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account security page (2)' });

            //WAGERED
            pool.query('SELECT -SUM(`amount`) AS `wagered` FROM `users_transactions` WHERE (' + [ ...Object.keys(config.settings.games.games.original), ...Object.keys(config.settings.games.games.classic) ].map(a => '`service` LIKE "' + a + '_%"').join(' OR ') + ') AND `userid` = ' + pool.escape(res.locals.user.userid) + ' AND `amount` < 0', function(err3, row3) {
                if(err3) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account security page (3)' });

                //WINNINGS
                pool.query('SELECT SUM(`amount`) AS `winnings` FROM `users_transactions` WHERE (' + [ ...Object.keys(config.settings.games.games.original), ...Object.keys(config.settings.games.games.classic) ].map(a => '`service` LIKE "' + a + '_%"').join(' OR ') + ') AND `userid` = ' + pool.escape(res.locals.user.userid) + ' AND `amount` > 0', function(err4, row4) {
                    if(err4) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account security page (4)' });

                    var response = {
                        account: {
                            user: {
                                userid: res.locals.user.userid,
                                name: res.locals.user.name,
                                avatar: res.locals.user.avatar,
                                rank: config.app.ranks[res.locals.user.rank],
                                level: {
                                    ...level,
                                    ...{
                                        tier: [ 'steel', 'bronze', 'silver', 'gold', 'diamond' ][Math.floor(level.level / 25)],
                                        progress: roundedToFixed((level.have - level.start) / (level.next - level.start) * 100, 2).toFixed(2)
                                    }
                                },
                                created: makeDate(new Date(res.locals.user.time_create * 1000))
                            },
                            stats: {
                                deposited: getFormatAmountString(row1[0].deposited),
                                withdrawn: getFormatAmountString(row2[0].withdrawn),
                                wagered: getFormatAmountString(row3[0].wagered),
                                profit: getFormatAmountString(getFormatAmount(row4[0].winnings) - getFormatAmount(row3[0].wagered))
                            },
                            security: {
                                email: null,
                                twofactor_authentication: {
                                    authenticator_app: {
                                        enabled: false,
                                        primary: false
                                    },
                                    email_verification: {
                                        enabled: false,
                                        primary: false
                                    }
                                },
                                sessions: []
                            }
                        }
                    }

                    if(!res.locals.user.authorized.account){
                        return res.render('accountSecurity', {
                            page: 'account',
                            name: config.app.pages['account'],
                            response: response
                        });
                    }

                    //TWO FACTOR AUTHENTICATION APP
                    pool.query('SELECT * FROM `authenticator_app` WHERE `userid` = ' + pool.escape(res.locals.user.userid) + ' AND `removed` = 0 AND `activated` = 1', function(err6, row6) {
                        if(err6) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account security page (6)' });

                        //TWO FACTOR AUTHENTICATION EMAIL VERIFICATION
                        pool.query('SELECT * FROM `email_verification` WHERE `userid` = ' + pool.escape(res.locals.user.userid) + ' AND `removed` = 0', function(err7, row7) {
                            if(err7) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account security page (7)' });

                            //TWO FACTOR AUTHENTICATION PRIMARY METHOD
                            pool.query('SELECT `method` FROM `twofactor_authentication` WHERE `userid` = ' + pool.escape(res.locals.user.userid) + ' AND `removed` = 0', function(err8, row8) {
                                if(err8) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account security page (8)' });

                                //SESSIONS
                                pool.query('SELECT users_sessions.id, users_sessions.session, users_logins.agent, users_logins.location, users_logins.time FROM `users_sessions` INNER JOIN `users_logins` ON users_sessions.userid = users_logins.userid AND users_sessions.id = users_logins.sessionid WHERE users_logins.id = (SELECT users_logins_test.id FROM `users_logins` `users_logins_test` WHERE users_logins.sessionid = users_logins_test.sessionid ORDER BY users_logins_test.time DESC LIMIT 1) AND users_sessions.userid = ' + pool.escape(res.locals.user.userid) + ' AND users_sessions.removed = 0 AND users_sessions.expire > ' + pool.escape(time()), function(err9, row9) {
                                    if(err9) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering account security page (9)' });

                                    var { session } = req.cookies;

                                    var twofactor_authentication_method = null;
                                    if(row8.length > 0) twofactor_authentication_method = row8[0].method;

                                    response.account.security.email = res.locals.user.email;

                                    response.account.security.twofactor_authentication.email_verification.enabled = row7.length > 0;
                                    response.account.security.twofactor_authentication.email_verification.primary = twofactor_authentication_method == 'email_verification';

                                    response.account.security.twofactor_authentication.authenticator_app.enabled = row6.length > 0;
                                    response.account.security.twofactor_authentication.authenticator_app.primary = twofactor_authentication_method == 'authenticator_app';

                                    response.account.security.sessions = row9.map(a => ({
                                        id: a.id,
                                        current: a.session == session,
                                        device: getUserDevice(a.agent),
                                        location: a.location,
                                        date: makeDate(new Date(a.time * 1000))
                                    }))

                                    res.render('accountSecurity', {
                                        page: 'account',
                                        name: config.app.pages['account'],
                                        response: response
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
};