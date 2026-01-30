var { pool } = require('@/lib/database.js');

var { haveRankPermission } = require('@/utils/utils.js');

var config = require('@/config/config.js');

var maintenance = async (req, res, next) => {
    pool.query('SELECT `reason` FROM `maintenance` WHERE `removed` = 0 ORDER BY `id` DESC LIMIT 1', function(err1, row1) {
        if(err1) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while processing maintenance middleware (1)' });

        if(row1.length <= 0) return next();
        if(row1.length > 0 && haveRankPermission('access_maintenance', res.locals.user ? res.locals.user.rank : 0)) return next();

        if(res.locals.app.paths[0] == 'login') return next();
        if(res.locals.app.paths[0] == 'register') return next();
        if(res.locals.app.paths[0] == 'auth') return next();
        if(res.locals.app.paths[0] == 'twofa') return next();
        if(res.locals.app.paths[0] == 'authorize') return next();

        res.status(503).render('maintenance', {
            layout: 'layouts/maintenance',
            page: 'maintenance',
            name: config.app.pages['maintenance'],
            response: {
                reason: row1[0].reason
            }
        });
    });
};

module.exports = maintenance;