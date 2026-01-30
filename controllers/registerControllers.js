var { pool } = require('@/lib/database.js');

var { time } = require('@/utils/formatDate.js');

var config = require('@/config/config.js');

exports.register = async (req, res, next) => {
    var returnUrl = req.query.returnUrl || '/';

    if(res.locals.user) return res.redirect(returnUrl);

    res.render('auth/register', {
        layout: 'layouts/auth',
        name: config.app.pages['register'],
        response: { returnUrl }
    });
};

exports.setPassword = async (req, res, next) => {
    var returnUrl = req.query.returnUrl || '/';

    if(!res.locals.user) return res.redirect(returnUrl);
    if(res.locals.user.password) return res.redirect(returnUrl);

    res.render('auth/setPassword', {
        layout: 'layouts/auth',
        name: config.app.pages['setPassword'],
        response: { returnUrl }
    });
};

exports.setEmail = async (req, res, next) => {
    var returnUrl = req.query.returnUrl || '/';

    if(!res.locals.user) return res.redirect(returnUrl);
    if(res.locals.user.email) return res.redirect(returnUrl);

    var token = req.session.setEmailToken || null;

    pool.query('SELECT `email` FROM `users_email_set_requests` WHERE `userid` = ' + pool.escape(res.locals.user.userid) + ' AND `token` = ' + pool.escape(token) + ' AND `removed` = 0 AND `used` = 0 AND `expire` > ' + pool.escape(time()), function(err1, row1) {
        if(err1) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering set email page (1)' });

        if(row1.length > 0) return res.redirect('/register/set-email/success?returnUrl=' + returnUrl + '&email=' + row1[0].email);

        res.render('auth/setEmail', {
            layout: 'layouts/auth',
            name: config.app.pages['setEmail'],
            response: { returnUrl }
        });
    });
};

exports.setEmailSuccess = async (req, res, next) => {
    var returnUrl = req.query.returnUrl || '/';

    if(!res.locals.user) return res.redirect(returnUrl);
    if(res.locals.user.email) return res.redirect(returnUrl);

    var { email } = req.query;

    res.render('auth/setEmailSuccess', {
        layout: 'layouts/auth',
        name: config.app.pages['setEmail'],
        response: { returnUrl, email }
    });
};