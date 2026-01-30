var { pool } = require('@/lib/database.js');

var { haveRankPermission } = require('@/utils/utils.js');

var banip = async (req, res, next) => {
    if(!res.locals.user) return next();

    var ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    pool.query('SELECT * FROM `bannedip` WHERE `ip` = ' + pool.escape(ip) + ' AND `removed` = 0', function(err1, row1) {
        if(err1) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while processing ban ip middleware (1)' });

        if(row1.length <= 0) return next();
        if(row1.length > 0 && haveRankPermission('exclude_ban_ip', res.locals.user ? res.locals.user.rank : 0)) return next();

        res.status(403).render('banip', { layout: 'layouts/error' });
    });
};

module.exports = banip;