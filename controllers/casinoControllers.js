var { haveRankPermission } = require('@/utils/utils.js');

var casinoService = require('@/services/games/casinoService.js');

var config = require('@/config/config.js');

exports.casinoUnset = async (req, res, next) => {
    res.redirect('/casino/lobby');
};

exports.casinoLobby = async (req, res, next) => {
    if(!config.settings.games.games.classic.casino.enable && !haveRankPermission('play_disabled', res.locals.user ? res.locals.user.rank : 0)) return next();

    res.render('casinoLobby', {
        page: 'casino',
        name: config.app.pages['casino'],
        response: {
            casino: {
                games: {
                    hot: casinoService.getHotGamesList(res.locals.user ? res.locals.user.userid : null),
                    slots: casinoService.getSlotsGamesList(res.locals.user ? res.locals.user.userid : null),
                    live: casinoService.getLiveGamesList(res.locals.user ? res.locals.user.userid : null)
                }
            }
        }
    });
};

exports.casinoSlots = async (req, res, next) => {
    if(!config.settings.games.games.classic.casino.enable && !haveRankPermission('play_disabled', res.locals.user ? res.locals.user.rank : 0)) return next();

    res.render('casinoSlots', {
        page: 'casino',
        name: config.app.pages['casino']
    });
};

exports.casinoLive = async (req, res, next) => {
    if(!config.settings.games.games.classic.casino.enable && !haveRankPermission('play_disabled', res.locals.user ? res.locals.user.rank : 0)) return next();

    res.render('casinoLive', {
        page: 'casino',
        name: config.app.pages['casino']
    });
};

exports.casinoFavorites = async (req, res, next) => {
    if(!config.settings.games.games.classic.casino.enable && !haveRankPermission('play_disabled', res.locals.user ? res.locals.user.rank : 0)) return next();

    res.render('casinoFavorites', {
        page: 'casino',
        name: config.app.pages['casino']
    });
};

exports.casinoGame = async (req, res, next) => {
    if(!config.settings.games.games.classic.casino.enable && !haveRankPermission('play_disabled', res.locals.user ? res.locals.user.rank : 0)) return next();

    res.render('casinoGame', {
        page: 'casino',
        name: config.app.pages['casino']
    });
};