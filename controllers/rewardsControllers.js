var { pool } = require('@/lib/database.js');

var { getFormatAmountString } = require('@/utils/formatAmount.js');

var config = require('@/config/config.js');

exports.rewards = async (req, res, next) => {
    var response = {
        rewards: {
            referral: null,
            redeemed: null,
            collected: {
                ...Object.keys(config.settings.server.binds).reduce((acc, cur) => ({ ...acc, [cur]: false }), {})
            },
            amounts: {
                steam: getFormatAmountString(config.app.rewards.amounts.steam),
                google: getFormatAmountString(config.app.rewards.amounts.google),
                discord: getFormatAmountString(config.app.rewards.amounts.discord),
                facebook: getFormatAmountString(config.app.rewards.amounts.facebook),
                refferal_code: getFormatAmountString(config.app.rewards.amounts.refferal_code),
                daily: {
                    total: getFormatAmountString(config.app.rewards.amounts.daily_start + config.app.rewards.amounts.daily_level * 100),
                    start: getFormatAmountString(config.app.rewards.amounts.daily_start),
                    level: getFormatAmountString(config.app.rewards.amounts.daily_level)
                }
            },
            requirements: {
                bonus_uses: {
                    min: Math.floor(config.app.rewards.requirements.bonus_uses.min),
                    max: Math.floor(config.app.rewards.requirements.bonus_uses.max)
                },
                bonus_amount: {
                    min: getFormatAmountString(config.app.rewards.requirements.bonus_amount.min),
                    max: getFormatAmountString(config.app.rewards.requirements.bonus_amount.max)
                }
            },
            binds: {
                ...Object.keys(config.settings.server.binds).reduce((acc, cur) => ({ ...acc, [cur]: false }), {})
            }
        }
    }

    if(!res.locals.user) return res.render('rewards', {
        page: 'rewards',
        name: config.app.pages['rewards'],
        response: response
    });

    pool.query('SELECT `code` FROM `referral_codes` WHERE `userid` = ' + pool.escape(res.locals.user.userid), function(err1, row1) {
        if(err1) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering rewards page (1)' });

        pool.query('SELECT users.name FROM `referral_uses` INNER JOIN `users` ON referral_uses.referral = users.userid WHERE referral_uses.userid = ' + pool.escape(res.locals.user.userid), function(err2, row2) {
            if(err2) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering rewards page (2)' });

            pool.query('SELECT `reward` FROM `users_rewards` WHERE `reward` IN ("steam", "google", "discord", "facebook") AND `userid` = ' + pool.escape(res.locals.user.userid), function(err3, row3) {
                if(err3) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering rewards page (3)' });

                pool.query('SELECT `bind` FROM `users_binds` WHERE `removed` = 0 AND `userid` = ' + pool.escape(res.locals.user.userid), function(err4, row4) {
                    if(err4) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering rewards page (4)' });

                    if(row1.length > 0) response.rewards.referral = row1[0].code;
                    if(row2.length > 0) response.rewards.redeemed = row2[0].name;

                    response.rewards.collected = {
                        ...Object.keys(config.settings.server.binds).reduce((acc, cur) => ({ ...acc, [cur]: false }), {}),
                        ...row3.reduce((acc, cur) => ({ ...acc, [cur.reward]: true }), {})
                    };

                    response.rewards.binds = {
                        ...Object.keys(config.settings.server.binds).reduce((acc, cur) => ({ ...acc, [cur]: false }), {}),
                        ...row4.reduce((acc, cur) => ({ ...acc, [cur.bind]: true }), {})
                    }

                    res.render('rewards', {
                        page: 'rewards',
                        name: config.app.pages['rewards'],
                        response: response
                    });
                });
            });
        });
    });
};