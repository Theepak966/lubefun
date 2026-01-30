var crypto = require('crypto');

var { pool } = require('@/lib/database.js');

var config = require('@/config/config.js');

var { calculateLevel, capitalizeText } = require('@/utils/utils.js');
var { roundedToFixed, getFormatAmountString } = require('@/utils/formatAmount.js');
var { makeDate, time } = require('@/utils/formatDate.js');

exports.adminUnset = async (req, res, next) => {
    if(!res.locals.user) return next();
    if(!res.locals.settings.allowed.admin.includes(res.locals.user.userid)) return next();

    res.redirect('/admin/dashboard');
};

exports.adminDashboardUnset = async (req, res, next) => {
    if(!res.locals.user) return next();
    if(!res.locals.settings.allowed.admin.includes(res.locals.user.userid)) return next();

    res.redirect('/admin/dashboard/summary');
};

exports.adminDashboardSummary = async (req, res, next) => {
    if(!res.locals.user) return next();
    if(!res.locals.settings.allowed.admin.includes(res.locals.user.userid)) return next();

    res.render('admin/adminDashboardSummary', {
        layout: 'layouts/admin',
        page: 'admin',
        name: config.app.pages['dashboard'],
        breadcrumb: [{
            page: 'dashboard',
            name: 'Dashboard'
        }, {
            page: 'summary',
            name: 'Summary'
        }]
    });
};

exports.adminDashboardGamesUnset = async (req, res, next) => {
    if(!res.locals.user) return next();
    if(!res.locals.settings.allowed.admin.includes(res.locals.user.userid)) return next();

    res.redirect('/admin/dashboard/games/summary');
};

exports.adminDashboardGamesSummary = async (req, res, next) => {
    if(!res.locals.user) return next();
    if(!res.locals.settings.allowed.admin.includes(res.locals.user.userid)) return next();

    res.render('admin/adminDashboardGamesSummary', {
        layout: 'layouts/admin',
        page: 'admin',
        name: config.app.pages['dashboard'],
        breadcrumb: [{
            page: 'dashboard',
            name: 'Dashboard'
        }, {
            page: 'games',
            name: 'Games'
        }, {
            page: 'summary',
            name: 'Summary'
        }]
    });
};

exports.adminDashboardGame = async (req, res, next) => {
    if(!res.locals.user) return next();
    if(!res.locals.settings.allowed.admin.includes(res.locals.user.userid)) return next();

    if(config.settings.games.games.original[req.params.game] === undefined && config.settings.games.games.classic[req.params.game] === undefined) return next();

    res.render('admin/adminDashboardGame', {
        layout: 'layouts/admin',
        page: 'admin',
        name: config.app.pages['dashboard'],
        breadcrumb: [{
            page: 'dashboard',
            name: 'Dashboard'
        }, {
            page: 'games',
            name: 'Games'
        }, {
            page: req.params.game,
            name: config.app.pages[req.params.game]
        }],
        response: {
            admin: {
                dashboard: {
                    game: req.params.game
                }
            }
        }
    });
};

exports.adminDashboardPaymentsDefault = async (req, res, next) => {
    if(!res.locals.user) return next();
    if(!res.locals.settings.allowed.admin.includes(res.locals.user.userid)) return next();

    res.redirect('/admin/dashboard/payments/summary');
};

exports.adminDashboardPaymentsSummary = async (req, res, next) => {
    if(!res.locals.user) return next();
    if(!res.locals.settings.allowed.admin.includes(res.locals.user.userid)) return next();

    res.render('admin/adminDashboardPaymentsSummary', {
        layout: 'layouts/admin',
        page: 'admin',
        name: config.app.pages['dashboard'],
        breadcrumb: [{
            page: 'dashboard',
            name: 'Dashboard'
        }, {
            page: 'payments',
            name: 'Payments'
        }, {
            page: 'summary',
            name: 'Summary'
        }]
    });
};

exports.adminDashboardPaymentsDeposits = async (req, res, next) => {
    if(!res.locals.user) return next();
    if(!res.locals.settings.allowed.admin.includes(res.locals.user.userid)) return next();

    res.render('admin/adminDashboardPaymentsDeposits', {
        layout: 'layouts/admin',
        page: 'admin',
        name: config.app.pages['dashboard'],
        breadcrumb: [{
            page: 'dashboard',
            name: 'Dashboard'
        }, {
            page: 'payments',
            name: 'Payments'
        }, {
            page: 'deposits',
            name: 'Deposits'
        }]
    });
};

exports.adminDashboardPaymentsWithdrawals = async (req, res, next) => {
    if(!res.locals.user) return next();
    if(!res.locals.settings.allowed.admin.includes(res.locals.user.userid)) return next();

    res.render('admin/adminDashboardPaymentsWithdrawals', {
        layout: 'layouts/admin',
        page: 'admin',
        name: config.app.pages['dashboard'],
        breadcrumb: [{
            page: 'dashboard',
            name: 'Dashboard'
        }, {
            page: 'payments',
            name: 'Payments'
        }, {
            page: 'withdrawals',
            name: 'Withdrawals'
        }]
    });
};

exports.adminSettings = async (req, res, next) => {
    if(!res.locals.user) return next();
    if(!res.locals.settings.allowed.admin.includes(res.locals.user.userid)) return next();

    var response = {
        admin: {
            settings: {
                maintenance: {
                    status: false
                },
                games: {
                    status: false
                },
                payments: {
                    status: false
                },
                tracking_links: {
                    list: [],
                    pages: 1,
                    page: 1
                },
                deposit_bonuses: {
                    list: [],
                    pages: 1,
                    page: 1
                },
                allowed: {
                    admin: []
                }
            }
        }
    };

    if(!res.locals.user.authorized.admin){
        return res.render('admin/adminSettings', {
            layout: 'layouts/admin',
            page: 'admin',
            name: config.app.pages['admin'],
            breadcrumb: [{
                page: 'settings',
                name: 'Settings'
            }],
            response: response
        });
    }

    pool.query('SELECT * FROM `maintenance` WHERE `removed` = 0 ORDER BY `id` DESC LIMIT 1', function(err1, row1) {
        if(err1) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering admin settings page (1)' });

        pool.query('SELECT COUNT(*) AS `count` FROM `tracking_links` WHERE `removed` = 0 AND (`expire` > ' + pool.escape(time()) + ' OR `expire` = -1)', function(err2, row2) {
            if(err2) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering admin settings page (2)' });

            pool.query('SELECT `id`, `userid`, `referral`, `usage` FROM `tracking_links` WHERE `removed` = 0 AND (`expire` > ' + pool.escape(time()) + ' OR `expire` = -1) ORDER BY `id` ASC LIMIT 10', function(err3, row3) {
                if(err3) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering admin settings page (3)' });

                pool.query('SELECT COUNT(*) AS `count` FROM `deposit_codes` WHERE `removed` = 0', function(err4, row4) {
                    if(err4) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering admin settings page (4)' });

                    pool.query('SELECT `id`, `referral`, `code`, `uses`, `amount` FROM `deposit_codes` WHERE `removed` = 0 ORDER BY `id` ASC LIMIT 10', function(err5, row5) {
                        if(err5) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering admin settings page (5)' });

                        var pages1 = Math.ceil(row2[0].count / 10);
                        var pages2 = Math.ceil(row4[0].count / 10);

                        if(row1.length > 0) {
                            response.admin.settings.maintenance = {
                                status: true,
                                reason: row1[0].reason
                            };
                        }

                        response.admin.settings.games.status = config.settings.games.status;
                        response.admin.settings.payments.status = config.settings.payments.status;

                        response.admin.settings.tracking_links.list = row3.map(a => ({
                            id: a.id,
                            referral: a.referral,
                            userid: a.userid,
                            usage: a.usage,
                            link: config.app.url + '?ref=' + a.referral
                        }));

                        if(pages1 > 0) {
                            response.admin.settings.tracking_links.pages = pages1;
                        }

                        response.admin.settings.deposit_bonuses.list = row5.map(a => ({
                            id: a.id,
                            code: a.code.toUpperCase(),
                            referral: a.referral,
                            uses: parseInt(a.uses),
                            amount: roundedToFixed(a.amount, 5).toFixed(5)
                        }));

                        if(pages2 > 0) {
                            response.admin.settings.deposit_bonuses.pages = pages2;
                        }

                        response.admin.settings.allowed.admin = config.settings.allowed.admin;

                        res.render('admin/adminSettings', {
                            layout: 'layouts/admin',
                            page: 'admin',
                            name: config.app.pages['admin'],
                            breadcrumb: [{
                                page: 'settings',
                                name: 'Settings'
                            }],
                            response: response
                        });
                    });
                });
            });
        });
    });
};

exports.adminUsers = async (req, res, next) => {
    if(!res.locals.user) return next();
    if(!res.locals.settings.allowed.admin.includes(res.locals.user.userid)) return next();

    var response = {
        admin: {
            users: {
                list: [],
                pages: 1,
                page: 1
            }
        }
    };

    if(!res.locals.user.authorized.admin){
        return res.render('admin/adminUsers', {
            layout: 'layouts/admin',
            page: 'admin',
            name: config.app.pages['admin'],
            breadcrumb: [{
                page: 'users',
                name: 'Users'
            }],
            response: response
        });
    }

    pool.query('SELECT COUNT(*) AS `count` FROM `users` WHERE `bot` = 0', function(err1, row1) {
        if(err1) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering admin users page (1)' });

        pool.query('SELECT `userid`, `name`, `avatar`, `xp`, `balance`, `rank`, `time_create` FROM `users` WHERE `bot` = 0 ORDER BY `id` ASC LIMIT 10', function(err2, row2) {
            if(err2) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering admin users page (2)' });

            var pages = Math.ceil(row1[0].count / 10);

            response.admin.users.list = row2.map(a => ({
                user: {
                    userid: a.userid,
                    name: a.name,
                    avatar: a.avatar,
                    level: calculateLevel(a.xp).level
                },
                balance: getFormatAmountString(a.balance),
                rank: config.app.ranks[a.rank],
                created: makeDate(new Date(a.time_create * 1000))
            }));

            if(pages > 0) {
                response.admin.users.pages = pages;
            }

            res.render('admin/adminUsers', {
                layout: 'layouts/admin',
                page: 'admin',
                name: config.app.pages['admin'],
                breadcrumb: [{
                    page: 'users',
                    name: 'Users'
                }],
                response: response
            });
        });
    });
};

exports.adminUser = async (req, res, next) => {
    if(!res.locals.user) return next();
    if(!res.locals.settings.allowed.admin.includes(res.locals.user.userid)) return next();

    if(!res.locals.user.authorized.admin) return res.redirect('/admin/users');

    var { userid } = req.params;

    pool.query('SELECT * FROM `users` WHERE `bot` = 0 AND `userid` = ' + pool.escape(userid), function(err1, row1) {
        if(err1) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering admin user page (1)' });

        if(row1.length <= 0) return next();

        var response = {
            admin: {
                user: {
                    profile: {
                        user: {
                            userid: row1[0].userid,
                            name: row1[0].name,
                            avatar: row1[0].avatar,
                            level: calculateLevel(row1[0].xp).level
                        },
                        balance: getFormatAmountString(row1[0].balance),
                        rollover: getFormatAmountString(row1[0].rollover),
                        rank: {
                            value: parseInt(row1[0].rank),
                            name: config.app.ranks[row1[0].rank]
                        },
                        exclusion: parseInt(row1[0].exclusion) > time() ? makeDate(new Date(row1[0].exclusion * 1000)) : null,
                        anonymous: parseInt(row1[0].anonymous) == 1 ? true : false,
                        private: parseInt(row1[0].private) == 1 ? true : false,
                        created: makeDate(new Date(row1[0].time_create * 1000))
                    },
                    twofactor_authentication: {
                        primary: null,
                        authenticator_app: false,
                        email_verification: false
                    },
                    binds: {
                        ...Object.keys(config.settings.server.binds).reduce((acc, cur) => ({ ...acc, [cur]: { bind: false } }), {})
                    },
                    restrictions: {
                        ...[ 'play', 'trade', 'site', 'mute' ].reduce((acc, cur) => ({ ...acc, [cur]: { active: false } }), {})
                    },
                    devices: 0,
                    ips: [],
                    bannedips: [],
                    referred: null,
                    ranks: Object.keys(config.app.ranks).filter(a => !isNaN(Number(a))).map(a => ({
                        rank: parseInt(a),
                        name: capitalizeText(config.app.ranks[a])
                    }))
                }
            }
        };

        //TWO FACTOR AUTHENTICATION
        pool.query('SELECT * FROM `authenticator_app` WHERE `userid` = ' + pool.escape(userid) + ' AND `activated` = 1 AND `removed` = 0', function(err2, row2) {
            if(err2) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering admin user page (2)' });

            pool.query('SELECT * FROM `email_verification` WHERE `userid` = ' + pool.escape(userid) + ' AND `removed` = 0', function(err3, row3) {
                if(err3) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering admin user page (3)' });

                pool.query('SELECT `method` FROM `twofactor_authentication` WHERE `userid` = ' + pool.escape(userid) + ' AND `removed` = 0', function(err4, row4) {
                    if(err4) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering admin user page (4)' });

                    //BINDS
                    pool.query('SELECT `bind`, `bindid` FROM `users_binds` WHERE `removed` = 0 AND `userid` = ' + pool.escape(userid), function(err5, row5) {
                        if(err5) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering admin user page (5)' });

                        //DEVICES
                        pool.query('SELECT COUNT(*) AS `count` FROM `users_sessions` WHERE `userid` = ' + pool.escape(userid) + ' AND `removed` = 0 AND `expire` > ' + pool.escape(time()), function(err6, row6) {
                            if(err6) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering admin user page (6)' });

                            //RESTRICTIONS
                            pool.query('SELECT `restriction`, `expire` FROM `users_restrictions` WHERE `userid` = ' + pool.escape(userid) + ' AND (`expire` = -1 OR `expire` > ' + pool.escape(time()) + ') AND `removed` = 0', function(err7, row7) {
                                if(err7) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering admin user page (7)' });

                                //IPS
                                pool.query('SELECT DISTINCT users_logins.ip FROM `users_sessions` INNER JOIN `users_logins` ON users_sessions.userid = users_logins.userid AND users_sessions.id = users_logins.sessionid WHERE users_logins.id = (SELECT users_logins_test.id FROM `users_logins` `users_logins_test` WHERE users_logins.sessionid = users_logins_test.sessionid ORDER BY users_logins_test.time DESC LIMIT 1) AND users_sessions.userid = ' + pool.escape(userid) + ' AND users_sessions.removed = 0 AND users_sessions.expire > ' + pool.escape(time()), function(err8, row8) {
                                    if(err8) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering admin user page (8)' });

                                    //BANNED IPS
                                    pool.query('SELECT DISTINCT bannedip.ip FROM `bannedip` INNER JOIN `users_logins` ON bannedip.ip = users_logins.ip WHERE users_logins.userid = ' + pool.escape(userid) + ' AND bannedip.removed = 0', function(err9, row9) {
                                        if(err9) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering admin user page (9)' });

                                        //REFERRED BY
                                        pool.query('SELECT tracking_links.usage FROM `tracking_links` INNER JOIN `tracking_joins` ON tracking_links.referral = tracking_joins.referral INNER JOIN `users_logins` ON tracking_joins.ip = users_logins.ip WHERE users_logins.userid = ' + pool.escape(userid) + ' AND tracking_links.removed = 0 AND (tracking_links.expire > ' + pool.escape(time()) + ' OR tracking_links.expire = -1) ORDER BY tracking_joins.id DESC LIMIT 1', function(err10, row10) {
                                            if(err10) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering admin user page (10)' });

                                            if(row4.length > 0) response.admin.user.twofactor_authentication.primary = row4[0].method;
                                            if(row2.length > 0) response.admin.user.twofactor_authentication.authenticator_app = true;
                                            if(row3.length > 0) response.admin.user.twofactor_authentication.email_verification = true;

                                            response.admin.user.binds = {
                                                ...Object.keys(config.settings.server.binds).reduce((acc, cur) => ({ ...acc, [cur]: { bind: false } }), {}),
                                                ...row5.reduce((acc, cur) => ({ ...acc, [cur.bind]: { bind: true, bindid: cur.bindid } }), {})
                                            };

                                            response.admin.user.restrictions = {
                                                ...[ 'play', 'trade', 'site', 'mute' ].reduce((acc, cur) => ({ ...acc, [cur]: { active: false } }), {}),
                                                ...row7.reduce((acc, cur) => ({ ...acc, [cur.restriction]: { active: true, expire: parseInt(cur.expire) == -1 ? 'never' : makeDate(new Date(cur.expire * 1000)) } }), {})
                                            };

                                            response.admin.user.devices = parseInt(row6[0].count);
                                            response.admin.user.ips = row8.map(a => a.ip);
                                            response.admin.user.bannedips = row9.map(a => a.ip);

                                            if(row10.length > 0) response.admin.user.referred = row10[0].usage;

                                            res.render('admin/adminUser', {
                                                layout: 'layouts/admin',
                                                page: 'admin',
                                                name: config.app.pages['admin'],
                                                breadcrumb: [{
                                                    page: 'users',
                                                    name: 'Users'
                                                }, {
                                                    page: row1[0].userid,
                                                    name: row1[0].name
                                                }],
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
        });
    });
};

exports.adminGames = async (req, res, next) => {
    if(!res.locals.user) return next();
    if(!res.locals.settings.allowed.admin.includes(res.locals.user.userid)) return next();

    var response = {
        admin: {
            games: {
                original: Object.keys(config.settings.games.games.original).map(a => ({
                    game: a,
                    enable: false,
                    house_edge: {
                        value: 0,
                        fixed: false
                    }
                })),
                classic: Object.keys(config.settings.games.games.classic).map(a => ({
                    game: a,
                    enable: false
                })),
                casino: {
                    real: false
                }
            }
        }
    };

    if(!res.locals.user.authorized.admin){
        return res.render('admin/adminGames', {
            layout: 'layouts/admin',
            page: 'admin',
            name: config.app.pages['admin'],
            breadcrumb: [{
                page: 'games',
                name: 'Games'
            }],
            response: response
        });
    }

    response.admin.games.original = Object.keys(config.settings.games.games.original).map(a => ({
        game: a,
        enable: config.settings.games.games.original[a].enable,
        house_edge: config.settings.games.games.original[a].house_edge
    }));

    response.admin.games.classic = Object.keys(config.settings.games.games.classic).map(a => ({
        game: a,
        enable: config.settings.games.games.classic[a].enable
    }));

    response.admin.games.casino.real = config.settings.games.casino.real;

    res.render('admin/adminGames', {
        layout: 'layouts/admin',
        page: 'admin',
        name: config.app.pages['admin'],
        breadcrumb: [{
            page: 'games',
            name: 'Games'
        }],
        response: response
    });
};

exports.adminPayments = async (req, res, next) => {
    if(!res.locals.user) return next();
    if(!res.locals.settings.allowed.admin.includes(res.locals.user.userid)) return next();

    var response = {
        admin: {
            payments: {
                crypto: {
                    list: [],
                    pages: 1,
                    page: 1
                },
                manually: {
                    amount: '0.00',
                    enable: {
                        crypto: false
                    }
                },
                enable: {
                    ...[
                        'crypto'
                    ].reduce((acc, cur) => ({ ...acc, [cur]: [] }), {})
                }
            }
        }
    };

    if(!res.locals.user.authorized.admin){
        return res.render('admin/adminPayments', {
            layout: 'layouts/admin',
            page: 'admin',
            name: config.app.pages['admin'],
            breadcrumb: [{
                page: 'payments',
                name: 'Payments'
            }],
            response: response
        });
    }

    //CRYPTO PAYMENTS
            pool.query('SELECT COUNT(*) AS `count` FROM `crypto_listings` WHERE `confirmed` = 0 AND `canceled` = 0', function(err3, row3) {
                if(err3) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering admin payments page (3)' });

                pool.query('SELECT `id`, `userid`, `amount`, `currency`, `time` FROM `crypto_listings` WHERE `confirmed` = 0 AND `canceled` = 0 ORDER BY `id` ASC LIMIT 10', function(err4, row4) {
                    if(err4) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering admin payments page (4)' });
                    var pages2 = Math.ceil(row3[0].count / 10);

                    response.admin.payments.crypto.list = row4.map(a => ({
                        id: a.id,
                        userid: a.userid,
                        amount: getFormatAmountString(a.amount),
                        currency: a.currency,
                        date: makeDate(new Date(a.time * 1000))
                    }));

                    if(pages2 > 0) {
                        response.admin.payments.crypto.pages = pages2;
                    }

                    response.admin.payments.manually.amount = getFormatAmountString(config.settings.payments.manually.amount);
                    response.admin.payments.manually.enable.crypto = config.settings.payments.manually.enable.crypto;

                    response.admin.payments.enable = {
                        ...[
                            'crypto'
                        ].reduce((acc, cur) => ({ ...acc, [cur]: Object.keys(config.settings.payments.methods[cur]).map(a => ({
                            method: a,
                            enable: {
                                deposit: config.settings.payments.methods[cur][a].enable.deposit,
                                withdraw: config.settings.payments.methods[cur][a].enable.withdraw
                            },
                            name: config.settings.payments.methods[cur][a].name
                        })) }), {}),
                    };

                    res.render('admin/adminPayments', {
                        layout: 'layouts/admin',
                        page: 'admin',
                        name: config.app.pages['admin'],
                        breadcrumb: [{
                            page: 'payments',
                            name: 'Payments'
                        }],
                        response: response
                    });
    });
            });
};

exports.adminGamebots = async (req, res, next) => {
    if(!res.locals.user) return next();
    if(!res.locals.settings.allowed.admin.includes(res.locals.user.userid)) return next();

    var response = {
        admin: {
            gamebots: {
                bots: {
                    list: [],
                    pages: 1,
                    page: 1
                },
                games: Object.keys(config.settings.games.bots.enable).map(a => ({
                    game: a,
                    name: config.settings.games.games.original[a].name,
                    enable: false
                }))
            }
        }
    };

    if(!res.locals.user.authorized.admin){
        return res.render('admin/adminGamebots', {
            layout: 'layouts/admin',
            page: 'admin',
            name: config.app.pages['admin'],
            breadcrumb: [{
                page: 'gamebots',
                name: 'Game Bots'
            }],
            response: response
        });
    }

    pool.query('SELECT COUNT(*) AS `count` FROM `users` WHERE `bot` = 1', function(err1, row1) {
        if(err1) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering admin game bots page (1)' });

        pool.query('SELECT `userid`, `name`, `avatar`, `xp`, `balance` FROM `users` WHERE `bot` = 1 ORDER BY `id` ASC LIMIT 10', function(err2, row2) {
            if(err2) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering admin game bots page (2)' });

            var pages = Math.ceil(row1[0].count / 10);

            response.admin.gamebots.bots.list = row2.map(a => ({
                user: {
                    userid: a.userid,
                    name: a.name,
                    avatar: a.avatar,
                    level: calculateLevel(a.xp).level
                },
                balance: getFormatAmountString(a.balance)
            }));

            if(pages > 0) {
                response.admin.gamebots.bots.pages = pages;
            }

            response.admin.gamebots.games = Object.keys(config.settings.games.bots.enable).map(a => ({
                game: a,
                name: config.settings.games.games.original[a].name,
                enable: config.settings.games.bots.enable[a]
            }));

            res.render('admin/adminGamebots', {
                layout: 'layouts/admin',
                page: 'admin',
                name: config.app.pages['admin'],
                breadcrumb: [{
                    page: 'gamebots',
                    name: 'Game Bots'
                }],
                response: response
            });
        });
    });
};

exports.adminSupportUnset = async (req, res, next) => {
    if(!res.locals.user) return next();
    if(!res.locals.settings.allowed.admin.includes(res.locals.user.userid)) return next();

    res.redirect('/admin/support/requests');
};

exports.adminSupportRequests = async (req, res, next) => {
    if(!res.locals.user) return next();
    if(!res.locals.settings.allowed.admin.includes(res.locals.user.userid)) return next();

    var response = {
        admin: {
            support: {
                requests: {
                    list: [],
                    pages: 1,
                    page: 1
                }
            }
        }
    };

    if(!res.locals.user.authorized.admin){
        return res.render('admin/adminSupportRequests', {
            layout: 'layouts/admin',
            page: 'admin',
            name: config.app.pages['admin'],
            breadcrumb: [{
                page: 'support',
                name: 'Support'
            }, {
                page: 'requests',
                name: 'Requests'
            }],
            response: response
        });
    }

    pool.query('SELECT COUNT(*) AS `count` FROM `support_requests`', function(err1, row1) {
        if(err1) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering admin support requests page (1)' });

        pool.query('SELECT support_requests.subject, support_requests.department, support_requests.closed, support_requests.status, support_requests.requestid, support_requests.update, support_requests.time, support_claims.userid, support_claims.name, support_claims.avatar, support_claims.xp FROM `support_requests` LEFT JOIN `support_claims` ON support_requests.id = support_claims.requestid AND support_claims.ended = 0 ORDER BY support_requests.status ASC, support_requests.id DESC LIMIT 10', function(err2, row2) {
            if(err2) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering admin support requests page (2)' });

            var pages = Math.ceil(row1[0].count / 10);

            response.admin.support.requests.list = row2.map(a => ({
                id: a.requestid,
                subject: a.subject,
                department: parseInt(a.department),
                closed: parseInt(a.closed),
                status: parseInt(a.status),
                assigned: parseInt(a.status) > 0 ? {
                    userid: a.userid,
                    name: a.name,
                    avatar: a.avatar,
                    level: calculateLevel(a.xp).level
                } : null,
                created: makeDate(new Date(a.time * 1000)),
                updated: makeDate(new Date(a.update * 1000))
            }));

            if(pages > 0) {
                response.admin.support.requests.pages = pages;
            }

            res.render('admin/adminSupportRequests', {
                layout: 'layouts/admin',
                page: 'admin',
                name: config.app.pages['admin'],
                breadcrumb: [{
                    page: 'support',
                    name: 'Support'
                }, {
                    page: 'requests',
                    name: 'Requests'
                }],
                response: response
            });
        });
    });
};

exports.adminSupportRequest = async (req, res, next) => {
    if(!res.locals.user) return next();
    if(!res.locals.settings.allowed.admin.includes(res.locals.user.userid)) return next();

    if(!res.locals.user.authorized.admin) return res.redirect('/admin/support');

    var { id } = req.params;

    pool.query('SELECT `id`, `closed`, `status`, `name`, `subject`, `department`, `requestid`, `update`, `time` FROM `support_requests` WHERE `requestid` = ' + pool.escape(id), function(err1, row1) {
        if(err1) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering admin support request page (1)' });

        if(row1.length <= 0) return next();

        pool.query('SELECT * FROM `support_messages` WHERE `requestid` = ' + pool.escape(row1[0].id) + ' ORDER BY `id` ASC', function(err2, row2) {
            if(err2) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering admin support request page (2)' });

            res.render('admin/adminSupportRequest', {
                layout: 'layouts/admin',
                page: 'admin',
                name: config.app.pages['admin'],
                breadcrumb: [{
                    page: 'support',
                    name: 'Support'
                }, {
                    page: 'request',
                    name: 'Request'
                }],
                response: {
                    admin: {
                        support: {
                            request: {
                                id: row1[0].requestid,
                                requester: row1[0].name,
                                subject: row1[0].subject,
                                department: parseInt(row1[0].department),
                                closed: parseInt(row1[0].closed),
                                status: parseInt(row1[0].status),
                                created: makeDate(new Date(row1[0].time * 1000)),
                                updated: makeDate(new Date(row1[0].update * 1000))
                            },
                            messages: row2.map(function(item){
                                return {
                                    user: {
                                        userid: item.userid,
                                        name: item.name,
                                        avatar: item.avatar,
                                        level: calculateLevel(item.xp).level
                                    },
                                    response: parseInt(item.response) == 1,
                                    message: item.message,
                                    date: makeDate(new Date(item.time * 1000))
                                }
                            })
                        }
                    }
                }
            });
        });
    });
};