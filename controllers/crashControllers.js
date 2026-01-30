var { haveRankPermission } = require('@/utils/utils.js');

var config = require('@/config/config.js');

exports.crash = async (req, res, next) => {
    if(!config.settings.games.games.original.crash.enable && !haveRankPermission('play_disabled', res.locals.user ? res.locals.user.rank : 0)) return next();

    res.render('crash', {
        page: 'crash',
        name: config.app.pages['crash']
    });
};