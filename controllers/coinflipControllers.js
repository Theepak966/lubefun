var { haveRankPermission } = require('@/utils/utils.js');

var config = require('@/config/config.js');

exports.coinflip = async (req, res, next) => {
    if(!config.settings.games.games.original.coinflip.enable && !haveRankPermission('play_disabled', res.locals.user ? res.locals.user.rank : 0)) return next();

    res.render('coinflip', {
        page: 'coinflip',
        name: config.app.pages['coinflip']
    });
};