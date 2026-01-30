var { pool } = require('@/lib/database.js');

var { getLocationByIp } = require('@/utils/utils.js');
var { time } = require('@/utils/formatDate.js');

var visitors = async (req, res, next) => {
    var link = req.protocol + '://' + req.get('host') + req.originalUrl;
    var ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    var agent = req.headers['user-agent'];

    getLocationByIp(ip, function(err1, response){
        if(err1) return res.status(409).render('409', { layout: 'layouts/error', error: err1.message });

        var location = [ response.city, response.region, response.country ].join(', ');

        pool.query('INSERT INTO `join_visitors` SET `link` = ' + pool.escape(link) + ', `ip` = ' + pool.escape(ip) + ', `location` = ' + pool.escape(location) + ', `agent` = ' + pool.escape(agent) + ', `time` = ' + pool.escape(time()), function(err2, row2) {
            if(err2) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while processing visitors middleware (1)' });

            next();
        });
    });
};

module.exports = visitors;