var { pool } = require('@/lib/database.js');

var { getLocationByIp } = require('@/utils/utils.js');
var { time } = require('@/utils/formatDate.js');

var trackingLink = async (req, res, next) => {
    if(!req.query.ref) return next();

    var ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    var agent = req.headers['user-agent'];

    var referral = req.query.ref;

    pool.query('SELECT * FROM `tracking_links` WHERE `referral` = ' + pool.escape(referral) + ' AND `removed` = 0 AND (`expire` > ' + pool.escape(time()) + ' OR `expire` = -1)', function(err1, row1) {
        if(err1) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while processing tracking links middleware (1)' });

        if(row1.length <= 0) return res.redirect(req.path);

        getLocationByIp(ip, function(err2, response){
            if(err2) return res.status(409).render('409', { layout: 'layouts/error', error: err2.message });

            var location = [ response.city, response.region, response.country ].join(', ');

            pool.query('INSERT INTO `tracking_joins` SET `referral` = ' + pool.escape(referral) + ', `ip` = ' + pool.escape(ip) + ', `location` = ' + pool.escape(location) + ', `agent` = ' + pool.escape(agent) + ', `time` = ' + pool.escape(time()), function(err3, row3) {
                if(err3) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while processing tracking links middleware (2)' });

                res.redirect(req.path);
            });
        });
    });
};

module.exports = trackingLink;