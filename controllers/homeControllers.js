var { roundedToFixed } = require('@/utils/formatAmount.js');

var casinoService = require('@/services/games/casinoService.js');

var config = require('@/config/config.js');

exports.home = async (req, res) => {
    res.render('home', {
        page: 'home',
        name: config.app.pages['home'],
        response: {
            home: {
                casino: {
                    games: {
                        hot: casinoService.getKnownGamesList(res.locals.user ? res.locals.user.userid : null),
                        slots: casinoService.getSlotsGamesList(res.locals.user ? res.locals.user.userid : null)
                    }
                },
                affiliates: {
                    commissions: Object.keys(config.app.affiliates.commissions).reduce((acc, cur) => ({ ...acc, [cur]: roundedToFixed(config.app.affiliates.commissions[cur] * config.app.affiliates.requirements.length, 2).toFixed(2) }), {})
                }
            }
        }
    });
};