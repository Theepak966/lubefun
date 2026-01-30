var { pool } = require('@/lib/database.js');

var { time } = require('@/utils/formatDate.js');

var config = require('@/config/config.js');

exports.login = async (req, res, next) => {
    var returnUrl = req.query.returnUrl || '/';

    if(res.locals.user) return res.redirect(returnUrl);

    res.render('auth/login', {
        layout: 'layouts/auth',
        name: config.app.pages['login'],
        response: { returnUrl }
    });
};

exports.forgotPassword = async (req, res, next) => {
    var returnUrl = req.query.returnUrl || '/';

    if(res.locals.user) return res.redirect(returnUrl);

    if(req.session.recoverySent) {
        var email = req.session.recoveryEmail;

        delete req.session.recoverySent;
        delete req.session.recoveryEmail;

        return res.redirect('/login/forgot-password/success?returnUrl=' + returnUrl + '&email=' + email);
    }

    res.render('auth/forgotPassword', {
        layout: 'layouts/auth',
        name: config.app.pages['forgotPassword'],
        response: { returnUrl }
    });
};

exports.forgotPasswordSuccess = async (req, res, next) => {
    var returnUrl = req.query.returnUrl || '/';

    if(res.locals.user) return res.redirect(returnUrl);

    var { email } = req.query;

    res.render('auth/forgotPasswordSuccess', {
        layout: 'layouts/auth',
        name: config.app.pages['forgotPassword'],
        response: { returnUrl, email }
    });
};

exports.resetPassword = async (req, res, next) => {
    var returnUrl = req.query.returnUrl || '/';

    if(res.locals.user) return res.redirect(returnUrl);

    var { token } = req.query;

    pool.query('SELECT `removed`, `used`, `email`, `expire` FROM `users_recovery_requests` WHERE `token` = ' + pool.escape(token), function(err1, row1) {
        if(err1) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering reset password page (1)' });

        if(row1.length <= 0) return res.redirect('/login/reset-password/expired?returnUrl=' + returnUrl);
        if(parseInt(row1[0].removed) || parseInt(row1[0].expire) <= time()) return res.redirect('/login/reset-password/expired?returnUrl=' + returnUrl);

        if(parseInt(row1[0].used)) return res.redirect('/login/reset-password/success?returnUrl=' + returnUrl);

        res.render('auth/resetPassword', {
            layout: 'layouts/auth',
            name: config.app.pages['resetPassword'],
            response: {
                returnUrl,
                token,
                expire: Math.floor(config.app.auth.expire.token.recover / 60)
            }
        });
    });
};

exports.resetPasswordExpired = async (req, res, next) => {
    var returnUrl = req.query.returnUrl || '/';

    if(res.locals.user) return res.redirect(returnUrl);

    res.render('auth/resetPasswordExpired', {
        layout: 'layouts/auth',
        name: config.app.pages['resetPassword'],
        response: { returnUrl }
    });
};

exports.resetPasswordSuccess = async (req, res, next) => {
    var returnUrl = req.query.returnUrl || '/';

    if(res.locals.user) return res.redirect(returnUrl);

    res.render('auth/resetPasswordSuccess', {
        layout: 'layouts/auth',
        name: config.app.pages['resetPassword'],
        response: { returnUrl }
    });
};