var { pool } = require('@/lib/database.js');
var { totp } = require('@/lib/totp.js');

var { generateSecurityCode } = require('@/utils/utils.js');
var { time } = require('@/utils/formatDate.js');

var mailerService = require('@/services/mailerService.js');

var config = require('@/config/config.js');

function sendEmailVerification(data, callback){
    pool.query('SELECT `email` FROM `users` WHERE `userid` = ' + pool.escape(data.userid), function (err1, row1) {
        if(err1) return callback(new Error('An error occurred while sending email verification (1)'));

        if(row1.length <= 0) return callback(new Error('An error occurred while sending email verification (2)'));

        pool.query('UPDATE `email_verification_codes` SET `removed` = 1 WHERE `userid` = ' + pool.escape(data.userid) + ' AND `used` = 0 AND `removed` = 0 AND `expire` > ' + pool.escape(time()), function(err2) {
            if(err2) return callback(new Error('An error occurred while sending email verification (3)'));

            var code = generateSecurityCode(6);

            pool.query('INSERT INTO `email_verification_codes` SET `userid` = ' + pool.escape(data.userid) + ', `code` = ' + pool.escape(code) + ', `expire` = ' + pool.escape(time() + config.app.auth.expire.code.twofa) + ', `time` = ' + pool.escape(time()), function(err3, row3) {
                if(err3) return callback(new Error('An error occurred while sending email verification (4)'));

                if(row3.affectedRows <= 0) return callback(new Error('An error occurred while sending email verification (5)'));

                var subject = 'Security Code';
                var message = 'Security Code: ' + code;

                mailerService.sendMail(row1[0].email, subject, message, function(err4) {
                    if(err4) return callback(err4);

                    pool.query('INSERT INTO `email_history` SET `email` = ' + pool.escape(row1[0].email) + ', `subject` = ' + pool.escape(subject) + ', `message` = ' + pool.escape(message) + ', `time` = ' + pool.escape(time()), function(err5, row5) {
                        if(err5) return callback(new Error('An error occurred while sending email verification (6)'));

                        if(row5.affectedRows <= 0) return callback(new Error('An error occurred while sending email verification (7)'));

                        callback(null);
                    });
                });
            });
        });
    });
}

function verifyAuthenticatorApp(data, callback){
    if(!(/(^[0-9]{6}$)/.exec(data.code))) return callback(new Error('The token is invalid or has expired. Please try again!'));

    pool.query('SELECT `userid` FROM `twofactor_authentication_requests` WHERE `token` = ' + pool.escape(data.token) + ' AND `removed` = 0 AND `used` = 0 AND `expire` > ' + pool.escape(time()), function(err1, row1) {
        if(err1) return callback(new Error('An error occurred while verifying authenticator app (1)'));

        if(row1.length <= 0) return callback(new Error('An error occurred while verifying authenticator app (2)'));

        pool.query('SELECT `secret` FROM `authenticator_app` WHERE `userid` = ' + pool.escape(row1[0].userid) + ' AND `removed` = 0 AND `activated` = 1', function(err2, row2) {
            if(err2) return callback(new Error('An error occurred while verifying authenticator app (3)'));

            if(row2.length <= 0) return callback(new Error('An error occurred while verifying authenticator app (4)'));

            var verified = totp.verifyToken(row2[0].secret, data.code);

            if(!verified) return callback(new Error('The token is invalid or has expired. Please try again!'));

            pool.query('UPDATE `twofactor_authentication_requests` SET `used` = 1 WHERE `token` = ' + pool.escape(data.token) + ' AND `removed` = 0 AND `used` = 0 AND `expire` > ' + pool.escape(time()), function(err3, row3) {
                if(err3) return callback(new Error('An error occurred while verifying authenticator app (5)'));

                if(row3.affectedRows <= 0) return callback(new Error('An error occurred while verifying authenticator app (6)'));

                callback(null, row1[0].userid);
            });
        });
    });
}

function verifyEmailVerification(data, callback){
    if(!(/(^[0-9]{6}$)/.exec(data.code))) return callback(new Error('The security code is invalid or has expired. Please try again!'));

    pool.query('SELECT `userid` FROM `twofactor_authentication_requests` WHERE `token` = ' + pool.escape(data.token) + ' AND `removed` = 0 AND `used` = 0 AND `expire` > ' + pool.escape(time()), function(err1, row1) {
        if(err1) return callback(new Error('An error occurred while verifying email verification (1)'));

        if(row1.length <= 0) return callback(new Error('An error occurred while verifying email verification (2)'));

        pool.query('SELECT * FROM `email_verification` WHERE `userid` = ' + pool.escape(row1[0].userid) + ' AND `removed` = 0', function(err2, row2) {
            if(err2) return callback(new Error('An error occurred while verifying email verification (3)'));

            if(row2.length <= 0) return callback(new Error('An error occurred while verifying email verification (4)'));

            pool.query('SELECT * FROM `email_verification_codes` WHERE `userid` = ' + pool.escape(row1[0].userid) + ' AND `code` = ' + pool.escape(data.code) + ' AND `removed` = 0 AND `used` = 0 AND `expire` > ' + pool.escape(time()), function(err3, row3) {
                if(err3) return callback(new Error('An error occurred while verifying email verification (5)'));

                if(row3.length <= 0) return callback(new Error('The security code is invalid or has expired. Please try again!'));

                pool.query('UPDATE `email_verification_codes` SET `used` = 1 WHERE `userid` = ' + pool.escape(row1[0].userid) + ' AND `code` = ' + pool.escape(data.code) + ' AND `removed` = 0 AND `used` = 0 AND `expire` > ' + pool.escape(time()), function(err4, row4) {
                    if(err4) return callback(new Error('An error occurred while verifying email verification (6)'));

                    if(row4.affectedRows <= 0) return callback(new Error('An error occurred while verifying email verification (7)'));

                    pool.query('UPDATE `twofactor_authentication_requests` SET `used` = 1 WHERE `token` = ' + pool.escape(data.token) + ' AND `removed` = 0 AND `used` = 0 AND `expire` > ' + pool.escape(time()), function(err5, row5) {
                        if(err5) return callback(new Error('An error occurred while verifying email verification (8)'));

                        if(row5.affectedRows <= 0) return callback(new Error('An error occurred while verifying email verification (9)'));

                        callback(null, row1[0].userid);
                    });
                });
            });
        });
    });
}

function verifyRecoveryCode(data, callback){
    if(!(/(^[0-9a-fA-F]{10}$)/.exec(data.code))) return callback(new Error('The recovery code is invalid or has expired. Please try again!'));

    pool.query('SELECT `userid` FROM `twofactor_authentication_requests` WHERE `token` = ' + pool.escape(data.token) + ' AND `removed` = 0 AND `used` = 0 AND `expire` > ' + pool.escape(time()), function(err1, row1) {
        if(err1) return callback(new Error('An error occurred while verifying recovery code (1)'));

        if(row1.length <= 0) return callback(new Error('An error occurred while verifying recovery code (2)'));

        pool.query('SELECT `id` FROM `authenticator_app` WHERE `userid` = ' + pool.escape(row1[0].userid) + ' AND `removed` = 0 AND `activated` = 1', function(err2, row2) {
            if(err2) return callback(new Error('An error occurred while verifying recovery code (3)'));

            if(row2.length <= 0) return callback(new Error('An error occurred while verifying recovery code (4)'));

            pool.query('SELECT * FROM `authenticator_app_recovery_codes` WHERE `appid` = ' + pool.escape(row2[0].id) + ' AND `code` = ' + pool.escape(data.code) + ' AND `removed` = 0 AND `used` = 0', function(err3, row3) {
                if(err3) return callback(new Error('An error occurred while verifying recovery code (5)'));

                if(row3.length <= 0) return callback(new Error('The recovery code is invalid or has expired. Please try again!'));

                pool.query('UPDATE `authenticator_app_recovery_codes` SET `used` = 1 WHERE `appid` = ' + pool.escape(row2[0].id) + ' AND `code` = ' + pool.escape(data.code) + ' AND `removed` = 0 AND `used` = 0', function(err4, row4) {
                    if(err4) return callback(new Error('An error occurred while verifying recovery code (6)'));

                    if(row4.affectedRows <= 0) return callback(new Error('An error occurred while verifying recovery code (7)'));

                    pool.query('UPDATE `twofactor_authentication_requests` SET `used` = 1 WHERE `token` = ' + pool.escape(data.token) + ' AND `removed` = 0 AND `used` = 0 AND `expire` > ' + pool.escape(time()), function(err5, row5) {
                        if(err5) return callback(new Error('An error occurred while verifying recovery code (8)'));

                        if(row5.affectedRows <= 0) return callback(new Error('An error occurred while verifying recovery code (9)'));

                        callback(null, row1[0].userid);
                    });
                });
            });
        });
    });
}

module.exports = {
    sendEmailVerification,
    verifyAuthenticatorApp, verifyEmailVerification, verifyRecoveryCode
};