var { pool } = require('@/lib/database.js');

var { makeDate } = require('@/utils/formatDate.js');
var { haveRankPermission } = require('@/utils/utils.js');
var { time } = require('@/utils/formatDate.js');

var config = require('@/config/config.js');

var bansite = async (req, res, next) => {
    if(!res.locals.user) return next();

    pool.query('SELECT users_restrictions.reason, users_restrictions.expire, users.name FROM `users_restrictions` INNER JOIN `users` ON users_restrictions.byuserid = users.userid WHERE users_restrictions.restriction = ' + pool.escape('site') + ' AND users_restrictions.removed = 0 AND (users_restrictions.expire = -1 OR users_restrictions.expire > ' + pool.escape(time()) + ') AND users_restrictions.userid = ' + pool.escape(res.locals.user.userid), function(err1, row1){
        if(err1) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while processing ban site middleware (1)' });

        if(row1.length <= 0) return next();
        if(row1.length > 0 && haveRankPermission('exclude_ban_site', res.locals.user ? res.locals.user.rank : 0)) return next();

        var expire = parseInt(row1[0].expire);

        res.render('banned', {
            page: 'banned',
            name: config.app.pages['banned'],
            response: {
                name: row1[0].name,
                reason: row1[0].reason,
                expire: expire == -1 ? 'never' : makeDate(new Date(expire * 1000))
            }
        });
    });
};

module.exports = bansite;