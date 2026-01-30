var passport = require('passport');

var { loggerError } = require('@/lib/logger.js');

var authService = require('@/services/auth/authService.js');

var limiter = require('@/middleware/limiter.js');

var config = require('@/config/config.js');

if(config.settings.server.binds.google !== undefined && config.settings.server.binds.google) require('@/controllers/api/google.js');
if(config.settings.server.binds.discord !== undefined && config.settings.server.binds.discord) require('@/controllers/api/discord.js');
if(config.settings.server.binds.steam !== undefined && config.settings.server.binds.steam) require('@/controllers/api/steam.js');

exports.login = async (req, res) => {
    if(res.locals.user) return res.status(409).json({ 'success': false, 'error': 'User already logged in' });

    var { email, password } = req.body;

    var ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    var agent = req.headers['user-agent'];

    authService.authWithLogin({ email, password }, function(err1, token, userid){
        if(err1) return res.status(409).json({ 'success': false, 'error': err1.message });

        limiter.login.resetKey(req.ip);

        if(token) {
            req.session.authenticationToken = token;

            return res.status(200).json({ 'success': true, 'message': null, 'reload': true });
        }

        authService.generateAccountRequest({
            userid, agent
        }, function(err2){
            if(err2) return res.status(409).json({ 'success': false, 'error': err2.message });

            authService.generateAdminRequest({
                userid, agent
            }, function(err3){
                if(err3) return res.status(409).json({ 'success': false, 'error': err3.message });

                authService.registerUserSession({
                    userid: userid,
                    type: 'login',
                    ip, agent
                }, function(err4, session, extendedSession){
                    if(err4) return res.status(409).json({ 'success': false, 'error': err4.message });

                    if(req.cookies.session) res.clearCookie('session');

                    var expiresIn = extendedSession ? config.app.auth.session.expire.extended : config.app.auth.session.expire.normal;

                    res.cookie('session', session, {
                        maxAge: expiresIn * 1000,
                        httpOnly: true,
                        secure: config.app.secure,
                        sameSite: 'lax'
                    });

                    res.status(200).json({ 'success': true, 'message': null, 'reload': true });
                });
            });
        });
    });
};

exports.register = async (req, res) => {
    if(res.locals.user) return res.status(409).json({ 'success': false, 'error': 'User already logged in' });

    var { name, email, password, confirm_password } = req.body;

    var ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    var agent = req.headers['user-agent'];

    authService.authWithRegister({ name, email, password, confirm_password }, function(err1, token, userid){
        if(err1) return res.status(409).json({ 'success': false, 'error': err1.message });

        limiter.register.resetKey(req.ip);

        if(token) {
            req.session.authenticationToken = token;

            return res.status(200).json({ 'success': true, 'message': null, 'reload': true });
        }

        authService.generateAccountRequest({
            userid, agent
        }, function(err2){
            if(err2) return res.status(409).json({ 'success': false, 'error': err2.message });

            authService.generateAdminRequest({
                userid, agent
            }, function(err3){
                if(err3) return res.status(409).json({ 'success': false, 'error': err3.message });

                authService.registerUserSession({
                    userid: userid,
                    type: 'register',
                    ip, agent
                }, function(err4, session, extendedSession){
                    if(err4) return res.status(409).json({ 'success': false, 'error': err4.message });

                    if(req.cookies.session) res.clearCookie('session');

                    var expiresIn = extendedSession ? config.app.auth.session.expire.extended : config.app.auth.session.expire.normal;

                    res.cookie('session', session, {
                        maxAge: expiresIn * 1000,
                        httpOnly: true,
                        secure: config.app.secure,
                        sameSite: 'lax'
                    });

                    res.status(200).json({ 'success': true, 'message': null, 'reload': true });
                });
            });
        });
    });
};

exports.google = async (req, res, next) => {
    if(res.locals.user && req.query.link !== 'true') return res.status(409).render('409', { layout: 'layouts/error', error: 'User already logged in' });

    req.session.link = req.query.link === 'true';
    req.session.returnUrl = req.query.returnUrl || '/';

    passport.authenticate('google')(req, res, next);
};

exports.googleCallback = async (req, res, next) => {
    passport.authenticate('google', { failureRedirect: '/' }, function(err1, user){
        var link = req.session.link;
        var returnUrl = req.session.returnUrl || '/';

        if(err1) {
            loggerError(err1);

            return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while receiving google callback (1)' });
        }

        if(!user) res.status(409).render('409', { layout: 'layouts/error', error: 'Authentication with Google failed' });

        delete req.session.link;
        delete req.session.returnUrl;

        var id = user.id;
        var email = user.emails[0].value;
        var name = user.displayName;
        var avatar = user.photos[0].value;

        var ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        var agent = req.headers['user-agent'];

        if(link){
            authService.bindAccount({ userid: res.locals.user.userid, bind: 'google', id }, function(err2){
                if(err2) return res.status(409).render('409', { layout: 'layouts/error', error: err2.message });

                limiter.google.resetKey(req.ip);

                res.redirect(returnUrl);
            });
        } else {
            authService.authWithGoogle({ id, email, name, avatar }, function(err2, token, userid){
                if(err2) return res.status(409).render('409', { layout: 'layouts/error', error: err2.message });

                limiter.google.resetKey(req.ip);

                if(token) {
                    req.session.authenticationToken = token;

                    return res.redirect(returnUrl);
                }

                authService.generateAccountRequest({
                    userid, agent
                }, function(err3){
                    if(err3) return res.status(409).render('409', { layout: 'layouts/error', error: err3.message });

                    authService.generateAdminRequest({
                        userid, agent
                    }, function(err4){
                        if(err4) return res.status(409).render('409', { layout: 'layouts/error', error: err4.message });

                        authService.registerUserSession({
                            userid: userid,
                            type: 'google',
                            ip, agent
                        }, function(err5, session, extendedSession){
                            if(err5) return res.status(409).render('409', { layout: 'layouts/error', error: err5.message });

                            if(req.cookies.session) res.clearCookie('session');

                            var expiresIn = extendedSession ? config.app.auth.session.expire.extended : config.app.auth.session.expire.normal;

                            res.cookie('session', session, {
                                maxAge: expiresIn * 1000,
                                httpOnly: true,
                                secure: config.app.secure,
                                sameSite: 'lax'
                            });

                            res.redirect(returnUrl);
                        });
                    });
                });
            });
        }
    })(req, res);
};

exports.discord = async (req, res, next) => {
    if(res.locals.user && req.query.link !== 'true') return res.status(409).render('409', { layout: 'layouts/error', error: 'User already logged in' });

    req.session.link = req.query.link === 'true';
    req.session.returnUrl = req.query.returnUrl || '/';

    passport.authenticate('discord')(req, res, next);
};

exports.discordCallback = async (req, res, next) => {
    passport.authenticate('discord', { failureRedirect: '/' }, function(err1, user){
        var link = req.session.link;
        var returnUrl = req.session.returnUrl || '/';

        if(err1) {
            loggerError(err1);

            return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while receiving google callback (1)' });
        }

        if(!user) return res.status(409).render('409', { layout: 'layouts/error', error: 'Authentication with Discord failed' });

        delete req.session.link;
        delete req.session.returnUrl;

        var id = user.id;
        var email = user.email;
        var name = user.global_name;
        var avatar = 'https://cdn.discordapp.com/avatars/' + id + '/' + user.avatar + '?size=100';

        var ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        var agent = req.headers['user-agent'];

        if(link){
            authService.bindAccount({ userid: res.locals.user.userid, bind: 'discord', id }, function(err2){
                if(err2) return res.status(409).render('409', { layout: 'layouts/error', error: err2.message });

                limiter.discord.resetKey(req.ip);

                res.redirect(returnUrl);
            });
        } else {
            authService.authWithDiscord({ id, email, name, avatar }, function(err2, token, userid){
                if(err2) return res.status(409).render('409', { layout: 'layouts/error', error: err2.message });

                limiter.discord.resetKey(req.ip);

                if(token) {
                    req.session.authenticationToken = token;

                    return res.redirect(returnUrl);
                }

                authService.generateAccountRequest({
                    userid, agent
                }, function(err3){
                    if(err3) return res.status(409).render('409', { layout: 'layouts/error', error: err3.message });

                    authService.generateAdminRequest({
                        userid, agent
                    }, function(err4){
                        if(err4) return res.status(409).render('409', { layout: 'layouts/error', error: err4.message });

                        authService.registerUserSession({
                            userid: userid,
                            type: 'discord',
                            ip, agent
                        }, function(err5, session, extendedSession){
                            if(err5) return res.status(409).render('409', { layout: 'layouts/error', error: err5.message });

                            if(req.cookies.session) res.clearCookie('session');

                            var expiresIn = extendedSession ? config.app.auth.session.expire.extended : config.app.auth.session.expire.normal;

                            res.cookie('session', session, {
                                maxAge: expiresIn * 1000,
                                httpOnly: true,
                                secure: config.app.secure,
                                sameSite: 'lax'
                            });

                            res.redirect(returnUrl);
                        });
                    });
                });
            });
        }
    })(req, res);
};

exports.steam = async (req, res, next) => {
    if(res.locals.user && req.query.link !== 'true') return res.status(409).render('409', { layout: 'layouts/error', error: 'User already logged in' });

    req.session.link = req.query.link === 'true';
    req.session.returnUrl = req.query.returnUrl || '/';

    passport.authenticate('steam')(req, res, next);
};

exports.steamCallback = async (req, res, next) => {
    passport.authenticate('steam', { failureRedirect: '/' }, function(err1, user){
        var link = req.session.link;
        var returnUrl = req.session.returnUrl || '/';

        if(err1) {
            loggerError(err1);

            return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while receiving google callback (1)' });
        }

        if(!user) return res.status(409).render('409', { layout: 'layouts/error', error: 'Authentication with Steam failed' });

        delete req.session.link;
        delete req.session.returnUrl;

        var id = user.id;
        var name = user.displayName;
        var avatar = user.photos[2].value;

        var ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        var agent = req.headers['user-agent'];

        if(link){
            authService.bindAccount({ userid: res.locals.user.userid, bind: 'steam', id }, function(err2){
                if(err2) return res.status(409).render('409', { layout: 'layouts/error', error: err2.message });

                limiter.steam.resetKey(req.ip);

                res.redirect(returnUrl);
            });
        } else {
            authService.authWithSteam({ id, name, avatar }, function(err2, token, userid){
                if(err2) return res.status(409).render('409', { layout: 'layouts/error', error: err2.message });

                limiter.steam.resetKey(req.ip);

                if(token) {
                    req.session.authenticationToken = token;

                    return res.redirect(returnUrl);
                }

                authService.generateAccountRequest({
                    userid, agent
                }, function(err3){
                    if(err3) return res.status(409).render('409', { layout: 'layouts/error', error: err3.message });

                    authService.generateAdminRequest({
                        userid, agent
                    }, function(err4){
                        if(err4) return res.status(409).render('409', { layout: 'layouts/error', error: err4.message });

                        authService.registerUserSession({
                            userid: userid,
                            type: 'steam',
                            ip, agent
                        }, function(err5, session, extendedSession){
                            if(err5) return res.status(409).render('409', { layout: 'layouts/error', error: err5.message });

                            if(req.cookies.session) res.clearCookie('session');

                            var expiresIn = extendedSession ? config.app.auth.session.expire.extended : config.app.auth.session.expire.normal;

                            res.cookie('session', session, {
                                maxAge: expiresIn * 1000,
                                httpOnly: true,
                                secure: config.app.secure,
                                sameSite: 'lax'
                            });

                            res.redirect(returnUrl);
                        });
                    });
                });
            });
        }
    })(req, res);
};

exports.forgotPassword = async (req, res, next) => {
    if(res.locals.user) return res.status(409).json({ 'success': false, 'error': 'User already logged in' });

    var { email } = req.body;

    var returnUrl = req.session.returnUrl || '/';

    authService.forgotPassword({ email, returnUrl }, function(err1){
        if(err1) return res.status(409).json({ 'success': false, 'error': err1.message });

        req.session.recoverySent = true;
        req.session.recoveryEmail = email;

        res.status(200).json({ 'success': true, 'message': null, 'reload': true });
    });
};

exports.resetPassword = async (req, res, next) => {
    if(res.locals.user) return res.status(409).json({ 'success': false, 'error': 'User already logged in' });

    var { token } = req.query;
    var { password, confirm_password } = req.body;

    authService.resetPassword({ token, password, confirm_password }, function(err1) {
        if(err1) return res.status(409).json({ 'success': false, 'error': err1.message });

        limiter.recover.resetKey(req.ip);

        res.status(200).json({ 'success': true, 'message': null, 'reload': true });
    });
};

exports.logout = async (req, res) => {
    if(!res.locals.user) return res.status(409).json({ 'success': false, 'error': 'User not logged in' });

    var session = req.cookies.session;
    var returnUrl = req.session.returnUrl || '/';

    var agent = req.headers['user-agent'];

    authService.logout({ userid: res.locals.user.userid, session, agent }, function(err1){
        if(err1) return res.status(409).json({ 'success': false, 'error': err1.message });

        res.clearCookie('session', {
            httpOnly: true,
            secure: config.app.secure,
            sameSite: 'None'
        });

        res.redirect(returnUrl);
    });
};

exports.changePassword = async (req, res, next) => {
    if(!res.locals.user) res.status(409).json({ 'success': false, 'error': 'User not logged in' });

    var { current_password, password, confirm_password } = req.body;

    var agent = req.headers['user-agent'];

    authService.changePassword({ userid: res.locals.user.userid, current_password, password, confirm_password, agent }, function(err1) {
        if(err1) return res.status(409).json({ 'success': false, 'error': err1.message });

        res.status(200).json({ 'success': true, 'message': 'Your password has been changed!', 'reload': false });
    });
};

exports.changeEmail = async (req, res, next) => {
    var returnUrl = req.query.returnUrl || '/';

    if(!res.locals.user) return res.redirect(returnUrl);

    var { token } = req.query;

    var agent = req.headers['user-agent'];

    authService.changeEmail({ token, agent }, function(err1) {
        if(err1) return res.redirect(returnUrl);

        return res.redirect(returnUrl);
    });
};

exports.setPassword = async (req, res, next) => {
    if(!res.locals.user) res.status(409).json({ 'success': false, 'error': 'User not logged in' });

    var { password, confirm_password } = req.body;

    authService.setPassword({ userid: res.locals.user.userid, password, confirm_password }, function(err1) {
        if(err1) return res.status(409).json({ 'success': false, 'error': err1.message });

        res.status(200).json({ 'success': true, 'message': null, 'reload': true });
    });
};

exports.setEmailRequest = async (req, res, next) => {
    if(!res.locals.user) res.status(409).json({ 'success': false, 'error': 'User not logged in' });

    var { email } = req.body;

    var returnUrl = req.query.returnUrl || '/';

    authService.setEmailRequest({ userid: res.locals.user.userid, email, returnUrl }, function(err1, token) {
        if(err1) return res.status(409).json({ 'success': false, 'error': err1.message });

        req.session.setEmailToken = token;

        res.status(200).json({ 'success': true, 'message': null, 'reload': true });
    });
};

exports.setEmail = async (req, res, next) => {
    var returnUrl = req.query.returnUrl || '/';

    if(!res.locals.user) return res.redirect(returnUrl);

    var { token } = req.query;

    authService.setEmail({ token }, function(err1) {
        if(err1) return res.redirect(returnUrl);

        res.redirect(returnUrl);
    });
};

exports.authorizeAccount = async (req, res) => {
    if(!res.locals.user) res.status(409).json({ 'success': false, 'error': 'User not logged in' });

    var { password } = req.body;

    var agent = req.headers['user-agent'];

    authService.authorizeAccountIdentity({ password, userid: res.locals.user.userid, agent }, function(err1) {
        if(err1) return res.status(409).json({ 'success': false, 'error': err1.message });

        req.session.authorizedAccount = true;

        res.status(200).json({ 'success': true, 'message': null, 'reload': true });
    });
};

exports.authorizeAdmin = async (req, res) => {
    if(!res.locals.user) res.status(409).json({ 'success': false, 'error': 'User not logged in' });

    var { password } = req.body;

    var agent = req.headers['user-agent'];

    authService.authorizeAdminIdentity({ password, userid: res.locals.user.userid, agent }, function(err1) {
        if(err1) return res.status(409).json({ 'success': false, 'error': err1.message });

        req.session.authorizedAdmin = true;

        res.status(200).json({ 'success': true, 'message': null, 'reload': true });
    });
};