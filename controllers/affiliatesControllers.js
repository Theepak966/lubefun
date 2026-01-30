var { pool } = require('@/lib/database.js');

var { roundedToFixed, getFormatAmount, getFormatAmountString } = require('@/utils/formatAmount.js');

var config = require('@/config/config.js');

exports.affiliates = async (req, res, next) => {
    var response = {
        affiliates: {
            stats: {
                commissions: {
                    deposited: '0.00000',
                    wagered: '0.00000'
                },
                collected: '0.00',
                available: '0.00000'
            },
            referrals: {
                list: [],
                pages: 1,
                page: 1
            },
            rank: {
                tier: 0,
                progress: '0.00',
                deposited: '0.00',
                target: getFormatAmountString(config.app.affiliates.requirements[1])
            },
            requirements: config.app.affiliates.requirements.map((a, index) => ({
                tier: index + 1,
                amount: getFormatAmountString(a),
                commissions: Object.keys(config.app.affiliates.commissions).reduce((acc, cur) => ({ ...acc, [cur]: roundedToFixed(config.app.affiliates.commissions[cur] * (index + 1), 2).toFixed(2) }), {})
            })),
            commissions: Object.keys(config.app.affiliates.commissions).reduce((acc, cur) => ({ ...acc, [cur]: roundedToFixed(config.app.affiliates.commissions[cur] * config.app.affiliates.requirements.length, 2).toFixed(2) }), {})
        }
    }

    if(!res.locals.user) return res.render('affiliates', {
        page: 'affiliates',
        name: config.app.pages['affiliates'],
        response: response
    });

    pool.query('SELECT * FROM `referral_codes` WHERE `userid` = ' + pool.escape(res.locals.user.userid), function(err1, row1) {
        if(err1) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering affiliates page (1)' });

        pool.query('SELECT COALESCE(SUM(referral_deposited.amount), 0) AS `amount` FROM `referral_uses` INNER JOIN `referral_deposited` ON referral_uses.userid = referral_deposited.userid WHERE referral_deposited.referral = ' + pool.escape(res.locals.user.userid), function(err2, row2) {
            if(err2) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering affiliates page (2)' });

            pool.query('SELECT COUNT(*) AS `count` FROM `referral_uses` LEFT JOIN (SELECT `userid`, SUM(`amount`) AS `amount`, SUM(`commission`) AS `commission` FROM `referral_deposited` WHERE `referral` = ' + pool.escape(res.locals.user.userid) + ' GROUP BY `userid`) `deposited` ON referral_uses.userid = deposited.userid LEFT JOIN (SELECT `userid`, SUM(`amount`) AS `amount`, SUM(`commission`) AS `commission` FROM `referral_wagered` WHERE `referral` = ' + pool.escape(res.locals.user.userid) + ' GROUP BY `userid`) `wagered` ON referral_uses.userid = wagered.userid WHERE referral_uses.referral = ' + pool.escape(res.locals.user.userid), function(err3, row3) {
                if(err3) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering affiliates page (3)' });

                pool.query('SELECT referral_uses.userid, COALESCE(deposited.amount, 0) AS `deposited`, COALESCE(deposited.commission, 0) AS `commission_deposited`, COALESCE(wagered.amount, 0) AS `wagered`, COALESCE(wagered.commission, 0) AS `commission_wagered` FROM `referral_uses` LEFT JOIN (SELECT `userid`, SUM(`amount`) AS `amount`, SUM(`commission`) AS `commission` FROM `referral_deposited` WHERE `referral` = ' + pool.escape(res.locals.user.userid) + ' GROUP BY `userid`) `deposited` ON referral_uses.userid = deposited.userid LEFT JOIN (SELECT `userid`, SUM(`amount`) AS `amount`, SUM(`commission`) AS `commission` FROM `referral_wagered` WHERE `referral` = ' + pool.escape(res.locals.user.userid) + ' GROUP BY `userid`) `wagered` ON referral_uses.userid = wagered.userid WHERE referral_uses.referral = ' + pool.escape(res.locals.user.userid) + ' ORDER BY COALESCE(deposited.amount, 0) + COALESCE(wagered.amount, 0) DESC LIMIT 10', function(err4, row4) {
                    if(err4) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering affiliates page (4)' });

                    if(row1.length > 0){
                        response.affiliates.stats.collected = getFormatAmountString(row1[0].collected);
                        response.affiliates.stats.available = roundedToFixed(row1[0].available, 5).toFixed(5);
                    }

                    response.affiliates.stats.commissions.deposited = roundedToFixed(row4.reduce((acc, cur) => acc + roundedToFixed(cur.commission_deposited, 5), 0), 5).toFixed(5);
                    response.affiliates.stats.commissions.wagered = roundedToFixed(row4.reduce((acc, cur) => acc + roundedToFixed(cur.commission_wagered, 5), 0), 5).toFixed(5);

                    var pages = Math.ceil(row3[0].count / 10);

                    response.affiliates.referrals.pages = pages > 0 ? pages : 1;
                    response.affiliates.referrals.list = row4.map(a => ({
                        userid: a.userid,
                        wagered: roundedToFixed(a.wagered, 5).toFixed(5),
                        deposited: roundedToFixed(a.deposited, 5).toFixed(5),
                        commissions: {
                            wagered: roundedToFixed(a.commission_wagered, 5).toFixed(5),
                            deposited: roundedToFixed(a.commission_deposited, 5).toFixed(5),
                            total: roundedToFixed(a.commission_wagered + a.commission_deposited, 5).toFixed(5)
                        }
                    }));

                    var deposited = getFormatAmount(row2[0].amount);

                    var tiers = config.app.affiliates.requirements.map((amount, tier) => ({ amount, tier })).filter(a => deposited < a.amount);
                    var tier = tiers.length > 0 ? tiers[0].tier : config.app.affiliates.requirements.length - 1;

                    response.affiliates.rank.tier = tier
                    response.affiliates.rank.progress = roundedToFixed(deposited / config.app.affiliates.requirements[tier] * 100, 2).toFixed(2);
                    response.affiliates.rank.deposited = getFormatAmountString(deposited);
                    response.affiliates.rank.target = getFormatAmountString(config.app.affiliates.requirements[tier]);

                    res.render('affiliates', {
                        page: 'affiliates',
                        name: config.app.pages['affiliates'],
                        response: response
                    });
                });
            });
        });
    });
};