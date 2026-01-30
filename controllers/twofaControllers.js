var { pool } = require('@/lib/database.js');

var { time } = require('@/utils/formatDate.js');

var twofaService = require('@/services/auth/twofaService.js');

var config = require('@/config/config.js');

exports.twofa = async (req, res, next) => {
    var returnUrl = req.query.returnUrl || '/';

    if(res.locals.user) return res.redirect(returnUrl);

    var { token } = req.query;

    pool.query('SELECT twofactor_authentication.method FROM `twofactor_authentication_requests` INNER JOIN `twofactor_authentication` ON twofactor_authentication_requests.userid = twofactor_authentication.userid WHERE twofactor_authentication_requests.token = ' + pool.escape(token) + ' AND twofactor_authentication_requests.removed = 0 AND twofactor_authentication_requests.used = 0 AND twofactor_authentication_requests.expire > ' + pool.escape(time()) + ' AND twofactor_authentication.removed = 0', function(err1, row1) {
        if(err1) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering twofactor authentication page (1)' });
        if(row1.length <= 0) return res.redirect('/twofa/expired?returnUrl=' + returnUrl);

        if(row1[0].method == 'authenticator_app') return res.redirect('/twofa/authenticator-app?returnUrl=' + returnUrl + '&token=' + token);
        else if(row1[0].method == 'email_verification') return res.redirect('/twofa/email-verification?returnUrl=' + returnUrl + '&token=' + token);

        res.redirect(returnUrl);
    });
};

exports.authenticatorApp = async (req, res, next) => {
    var returnUrl = req.query.returnUrl || '/';

    if(res.locals.user) return res.redirect(returnUrl);

    var { token } = req.query;

    pool.query('SELECT `userid` FROM `twofactor_authentication_requests` WHERE `token` = ' + pool.escape(token) + ' AND `removed` = 0 AND `used` = 0 AND `expire` > ' + pool.escape(time()), function(err1, row1) {
        if(err1) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering twofactor authenticator app page (1)' });
        if(row1.length <= 0) return res.redirect('/twofa/expired?returnUrl=' + returnUrl);

        pool.query('SELECT * FROM `authenticator_app` WHERE `userid` = ' + pool.escape(row1[0].userid) + ' AND `removed` = 0 AND `activated` = 1', function(err2, row2) {
            if(err2) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering twofactor authenticator app page (2)' });
            if(row2.length <= 0) return res.redirect('/twofa?returnUrl=' + returnUrl + '&token=' + token);

            var methods = {
                authenticator_app: row2.length > 0,
                email_verification: true,
                recovery_code: row2.length > 0
            };

            res.render('auth/twofaAuthenticatorApp', {
                layout: 'layouts/auth',
                name: config.app.pages['twofa'],
                response: { token, returnUrl, methods }
            });
        });
    });
};

exports.emailVerification = async (req, res, next) => {
    var returnUrl = req.query.returnUrl || '/';

    if(res.locals.user) return res.redirect(returnUrl);

    var { token } = req.query;

    pool.query('SELECT `userid` FROM `twofactor_authentication_requests` WHERE `token` = ' + pool.escape(token) + ' AND `removed` = 0 AND `used` = 0 AND `expire` > ' + pool.escape(time()), function(err1, row1) {
        if(err1) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering twofactor email verification page (1)' });
        if(row1.length <= 0) return res.redirect('/twofa/expired?returnUrl=' + returnUrl);

        pool.query('SELECT * FROM `authenticator_app` WHERE `userid` = ' + pool.escape(row1[0].userid) + ' AND `removed` = 0 AND `activated` = 1', function(err2, row2) {
            if(err2) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering twofactor email verification page (2)' });

            var methods = {
                authenticator_app: row2.length > 0,
                email_verification: true,
                recovery_code: row2.length > 0
            };

            res.render('auth/twofaEmailVerification', {
                layout: 'layouts/auth',
                name: config.app.pages['twofa'],
                response: { token, returnUrl, methods }
            });
        });
    });
};

exports.recoveryCode = async (req, res, next) => {
    var returnUrl = req.query.returnUrl || '/';

    if(res.locals.user) return res.redirect(returnUrl);

    var { token } = req.query;

    pool.query('SELECT `userid` FROM `twofactor_authentication_requests` WHERE `token` = ' + pool.escape(token) + ' AND `removed` = 0 AND `used` = 0 AND `expire` > ' + pool.escape(time()), function(err1, row1) {
        if(err1) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering twofactor recovery code page (1)' });
        if(row1.length <= 0) return res.redirect('/twofa/expired?returnUrl=' + returnUrl);

        pool.query('SELECT * FROM `authenticator_app` WHERE `userid` = ' + pool.escape(row1[0].userid) + ' AND `removed` = 0 AND `activated` = 1', function(err2, row2) {
            if(err2) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering twofactor recovery code page (2)' });
            if(row2.length <= 0) return res.redirect('/twofa?returnUrl=' + returnUrl + '&token=' + token);

            var methods = {
                authenticator_app: row2.length > 0,
                email_verification: true,
                recovery_code: row2.length > 0
            };

            res.render('auth/twofaRecoveryCode', {
                layout: 'layouts/auth',
                name: config.app.pages['twofa'],
                response: { token, returnUrl, methods }
            });
        });
    });
};

exports.options = async (req, res, next) => {
    var returnUrl = req.query.returnUrl || '/';

    if(res.locals.user) return res.redirect(returnUrl);

    var { token } = req.query;

    pool.query('SELECT `userid` FROM `twofactor_authentication_requests` WHERE `token` = ' + pool.escape(token) + ' AND `removed` = 0 AND `used` = 0 AND `expire` > ' + pool.escape(time()), function(err1, row1) {
        if(err1) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering twofactor options page (1)' });
        if(row1.length <= 0) return res.redirect('/twofa/expired?returnUrl=' + returnUrl);

        pool.query('SELECT * FROM `authenticator_app` WHERE `userid` = ' + pool.escape(row1[0].userid) + ' AND `removed` = 0 AND `activated` = 1', function(err2, row2) {
            if(err2) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering twofactor options page (2)' });
            if(row2.length <= 0) return res.redirect('/twofa?returnUrl=' + returnUrl + '&token=' + token);

            var methods = {
                authenticator_app: row2.length > 0,
                email_verification: true,
                recovery_code: row2.length > 0
            };

            res.render('auth/twofaOptions', {
                layout: 'layouts/auth',
                name: config.app.pages['twofa'],
                response: { token, returnUrl, methods }
            });
        });
    });
};

exports.expired = async (req, res) => {
    var returnUrl = req.query.returnUrl || '/';

    if(res.locals.user) return res.redirect(returnUrl);

    res.render('auth/twofaExpired', {
        layout: 'layouts/auth',
        name: config.app.pages['twofa'],
        response: { returnUrl }
    });
};

exports.sendEmailVerification = async (req, res, next) => {
    var returnUrl = req.query.returnUrl || '/';

    if(res.locals.user) return res.redirect(returnUrl);

    var { token } = req.query;

    pool.query('SELECT `userid` FROM `twofactor_authentication_requests` WHERE `token` = ' + pool.escape(token) + ' AND `removed` = 0 AND `used` = 0 AND `expire` > ' + pool.escape(time()), function(err1, row1) {
        if(err1) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering twofactor send email verification page (1)' });
        if(row1.length <= 0) return res.redirect('/twofa/expired?returnUrl=' + returnUrl);

        twofaService.sendEmailVerification({ userid: row1[0].userid }, function(err2){
            if(err2) return res.status(409).render('409', { layout: 'layouts/error', error: err2.message });

            res.redirect('/twofa/email-verification?returnUrl=' + returnUrl + '&token=' + token);
        });
    });
};