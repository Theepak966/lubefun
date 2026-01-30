var passport = require('passport');

var { pool } = require('@/lib/database.js');
var { loggerError } = require('@/lib/logger.js');

var { time } = require('@/utils/formatDate.js');

var authService = require('@/services/auth/authService.js');
var twofaService = require('@/services/auth/twofaService.js');

var limiter = require('@/middleware/limiter.js');

var config = require('@/config/config.js');

exports.authenticatorApp = async (req, res) => {
    if(res.locals.user) return res.status(409).json({ 'success': false, 'error': 'User already logged in' });

    var { code } = req.body;
    var { token } = req.query;

    var ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    var agent = req.headers['user-agent'];

    twofaService.verifyAuthenticatorApp({ code, token }, function(err1, userid){
        if(err1) return res.status(409).json({ 'success': false, 'error': err1.message });

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
                    type: 'twofa',
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

exports.emailVerification = async (req, res) => {
    if(res.locals.user) return res.status(409).json({ 'success': false, 'error': 'User already logged in' });

    var { code } = req.body;
    var { token } = req.query;

    var ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    var agent = req.headers['user-agent'];

    twofaService.verifyEmailVerification({ code, token }, function(err1, userid){
        if(err1) return res.status(409).json({ 'success': false, 'error': err1.message });

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
                    type: 'twofa',
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

exports.recoveryCode = async (req, res) => {
    if(res.locals.user) return res.status(409).json({ 'success': false, 'error': 'User already logged in' });

    var { code } = req.body;
    var { token } = req.query;

    var ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    var agent = req.headers['user-agent'];

    twofaService.verifyRecoveryCode({ code, token }, function(err1, userid){
        if(err1) return res.status(409).json({ 'success': false, 'error': err1.message });

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
                    type: 'twofa',
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