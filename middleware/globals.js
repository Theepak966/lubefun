var { haveRankPermission } = require('@/utils/utils.js');

var config = require('@/config/config.js');

var globals = async (req, res, next) => {
    res.locals.app = {
        paths: req.path.slice(1).split('/').filter((a, i) => a.length > 0 || i == 0),

        name: config.app.name,
		abbreviation: config.app.abbreviation,
		url: config.app.url,
        port: config.app.port,
        secure: config.app.secure,
        keywords: config.app.keywords,
        autor: config.app.autor,
        description: config.app.description,
        themecolor: config.app.themecolor,
        links: {
            steam_group: config.app.social.steam_group,
            twitter_page: config.app.social.twitter_page
        },

        recaptcha: {
            public_key: config.app.recaptcha.public_key
        }
    };

    res.locals.account = {
        permissions: Object.keys(config.app.permissions).reduce((acc, cur) => ({ ...acc, [cur]: haveRankPermission(cur, res.locals.user ? res.locals.user.rank : 0) }), {}),
        authorized: res.locals.user ? res.locals.user.authorized : {
            account: false,
            admin: false
        }
    };

    res.locals.settings = {
        allowed: config.settings.allowed,
        games: {
            original: Object.keys(config.settings.games.games.original).map(a => ({
                game: a,
                enable: config.settings.games.games.original[a].enable,
                name: config.settings.games.games.original[a].name,
                description: config.settings.games.games.original[a].description,
                house_edge: config.settings.games.games.original[a].house_edge,
                rtp: 100 - config.settings.games.games.original[a].house_edge.value
            })),
            classic: Object.keys(config.settings.games.games.classic).map(a => ({
                game: a,
                active: config.settings.games.games.classic[a].active,
                enable: config.settings.games.games.classic[a].enable,
                name: config.settings.games.games.classic[a].name,
                description: config.settings.games.games.classic[a].description
            }))
        }
    };

    next();
};

module.exports = globals;