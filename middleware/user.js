var crypto = require('crypto');

var { getUserBySession } = require('@/utils/user.js');

var user = async (req, res, next) => {
    res.locals.user = null;

    var { session } = req.cookies;

    if (!session) return next();

    var agent = req.headers['user-agent'];
    var device = crypto.createHash('sha256').update(agent).digest('hex');

    getUserBySession(session, device, function(err1, data1) {
        if(err1) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while processing user middleware (1)' });

        if(!data1) return next();

        res.locals.user = data1;

        next();
    });
};

module.exports = user;