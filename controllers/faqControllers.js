var { roundedToFixed, getFormatAmountString } = require('@/utils/formatAmount.js');

var config = require('@/config/config.js');

exports.faq = async (req, res) => {
    res.render('faq', {
        page: 'faq',
        name: config.app.pages['faq'],
        response: {
            faq: {
                rewards: {
                    daily: getFormatAmountString(config.app.rewards.amounts.daily_start + config.app.rewards.amounts.daily_level * 100),
                    referral: getFormatAmountString(config.app.rewards.amounts.refferal_code)
                },
                affiliates: {
                    commissions: Object.keys(config.app.affiliates.commissions).reduce((acc, cur) => ({ ...acc, [cur]: roundedToFixed(config.app.affiliates.commissions[cur] * config.app.affiliates.requirements.length, 2).toFixed(2) }), {})
                }
            }
        }
    });
};