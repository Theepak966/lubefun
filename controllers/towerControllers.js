var { haveRankPermission } = require('@/utils/utils.js');

var config = require('@/config/config.js');

exports.tower = async (req, res, next) => {
    if(!config.settings.games.games.original.tower.enable && !haveRankPermission('play_disabled', res.locals.user ? res.locals.user.rank : 0)) return next();

    res.render('tower', {
        page: 'tower',
        name: config.app.pages['tower']
    });
};