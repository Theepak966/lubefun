/**
 * Blackjack page controller.
 *
 * Why this exists:
 * - Keep route handlers tiny and consistent with other original games.
 * - Enforce "game enabled" + rank override checks centrally.
 */
var { haveRankPermission } = require('@/utils/utils.js');
var config = require('@/config/config.js');

exports.blackjack = async (req, res, next) => {
    if(!config.settings.games.games.original.blackjack.enable && !haveRankPermission('play_disabled', res.locals.user ? res.locals.user.rank : 0)) return next();

    res.render('blackjack', {
        page: 'blackjack',
        name: config.app.pages['blackjack']
    });
};

