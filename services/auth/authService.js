var crypto = require('crypto');

var { pool } = require('@/lib/database.js');
var { uuid } = require('@/lib/uuid.js');

var { getLocationByIp, haveRankPermission, escapeHTML, generateSessionToken, generateHexCode, generateSecurityCode } = require('@/utils/utils.js');
var { time } = require('@/utils/formatDate.js');

var mailerService = require('@/services/mailerService.js');

var config = require('@/config/config.js');

/* ----- INTERNAL USAGE ----- */
function registerChanged(userid, changeid, changes, callback){
    if(changeid >= changes.length) return callback(null);

    pool.query('INSERT INTO `users_changes` SET `userid` = ' + pool.escape(userid) + ', `change` = ' + pool.escape(changes[changeid].name) + ', `value` = ' + pool.escape(changes[changeid].value) + ', `time` = ' + pool.escape(time()), function(err1, row1) {
        if(err1) return callback(new Error('An error occurred while registering changes (1)'));

        if(row1.affectedRows <= 0) return callback(new Error('An error occurred while registering changes (2)'));

        registerChanged(userid, changeid + 1, changes, callback);
    });
}

/* ----- INTERNAL USAGE ----- */
function checkTwofa(userid, callback){
    pool.query('SELECT `method` FROM `twofactor_authentication` WHERE `userid` = ' + pool.escape(userid) + ' AND `removed` = 0', function (err1, row1) {
        if(err1) return callback(new Error('An error occurred while checking twofa (1)'));

        if(row1.length <= 0) return callback(null, false);

        var method = row1[0].method;
        if(method != 'email_verification') return callback(null, true);

        pool.query('SELECT `email` FROM `users` WHERE `userid` = ' + pool.escape(userid), function (err2, row2) {
            if(err2) return callback(new Error('An error occurred while checking twofa (2)'));

            if(row2.length <= 0) return callback(new Error('An error occurred while checking twofa (3)'));

            pool.query('UPDATE `email_verification_codes` SET `removed` = 1 WHERE `userid` = ' + pool.escape(userid) + ' AND `used` = 0 AND `removed` = 0 AND `expire` > ' + pool.escape(time()), function(err3) {
                if(err3) return callback(new Error('An error occurred while checking twofa (4)'));

                var code = generateSecurityCode(6);

                pool.query('INSERT INTO `email_verification_codes` SET `userid` = ' + pool.escape(userid) + ', `code` = ' + pool.escape(code) + ', `expire` = ' + pool.escape(time() + config.app.auth.expire.code.twofa) + ', `time` = ' + pool.escape(time()), function(err4, row4) {
                    if(err4) return callback(new Error('An error occurred while checking twofa (5)'));

                    if(row4.affectedRows <= 0) return callback(new Error('An error occurred while checking twofa (6)'));

                    var subject = 'Security Code';
                    var message = 'Security Code: ' + code;

                    mailerService.sendMail(row2[0].email, subject, message, function(err5) {
                        if(err5) return callback(err5);

                        pool.query('INSERT INTO `email_history` SET `email` = ' + pool.escape(row2[0].email) + ', `subject` = ' + pool.escape(subject) + ', `message` = ' + pool.escape(message) + ', `time` = ' + pool.escape(time()), function(err6, row6) {
                            if(err6) return callback(new Error('An error occurred while checking twofa (7)'));

                            if(row6.affectedRows <= 0) return callback(new Error('An error occurred while checking twofa (8)'));

                            callback(null, true);
                        });
                    });
                });
            });
        });
    });
}

/* ----- INTERNAL USAGE ----- */
function generateAuthRequest(userid, callback){
    pool.query('UPDATE `twofactor_authentication_requests` SET `removed` = 1 WHERE `userid` = ' + pool.escape(userid) + ' AND `used` = 0 AND `removed` = 0 AND `expire` > ' + pool.escape(time()), function(err1) {
        if(err1) return callback(new Error('An error occurred while generating auth request (1)'));

        var token = generateHexCode(32);

        pool.query('INSERT INTO `twofactor_authentication_requests` SET `userid` = ' + pool.escape(userid) + ', `token` = ' + pool.escape(token) + ', `expire` = ' + pool.escape(time() + config.app.auth.expire.token.authentication) + ', `time` = ' + pool.escape(time()), function(err2, row2) {
            if(err2) return callback(new Error('An error occurred while generating auth request (2)'));

            if(row2.affectedRows <= 0) return callback(new Error('An error occurred while generating auth request (3)'));

            callback(null, token);
        });
    });
}

/* ----- INTERNAL USAGE ----- */
function generateAccountRequest(data, callback){
    var device = crypto.createHash('sha256').update(data.agent).digest('hex');

    pool.query('UPDATE `users_security_requests` SET `removed` = 1 WHERE `userid` = ' + pool.escape(data.userid) + ' AND `device` = ' + pool.escape(device) + ' AND `removed` = 0 AND `expire` > ' + pool.escape(time()), function(err1) {
        if(err1) return callback(new Error('An error occurred while generating account request (1)'));

        pool.query('INSERT INTO `users_security_requests` SET `userid` = ' + pool.escape(data.userid) + ', `device` = ' + pool.escape(device) + ', `expire` = ' + pool.escape(time() + config.app.auth.expire.sessions.security) + ', `time` = ' + pool.escape(time()), function(err2, row2) {
            if(err2) return callback(new Error('An error occurred while generating account request (2)'));

            if(row2.affectedRows <= 0) return callback(new Error('An error occurred while generating account request (3)'));

            callback(null);
        });
    });
}

/* ----- INTERNAL USAGE ----- */
function generateAdminRequest(data, callback){
    var device = crypto.createHash('sha256').update(data.agent).digest('hex');

    pool.query('UPDATE `admin_requests` SET `removed` = 1 WHERE `userid` = ' + pool.escape(data.userid) + ' AND `device` = ' + pool.escape(device) + ' AND `removed` = 0 AND `expire` > ' + pool.escape(time()), function(err1) {
        if(err1) return callback(new Error('An error occurred while generating admin request (1)'));

        pool.query('INSERT INTO `admin_requests` SET `userid` = ' + pool.escape(data.userid) + ', `device` = ' + pool.escape(device) + ', `expire` = ' + pool.escape(time() + config.app.auth.expire.sessions.security) + ', `time` = ' + pool.escape(time()), function(err2, row2) {
            if(err2) return callback(new Error('An error occurred while generating admin request (2)'));

            if(row2.affectedRows <= 0) return callback(new Error('An error occurred while generating admin request (3)'));

            callback(null);
        });
    });
}

function registerUserSession(data, callback){
    pool.query('SELECT `rank` FROM `users` WHERE `userid` = ' + pool.escape(data.userid), function(err1, row1) {
        if(err1) return callback(new Error('An error occurred while registering user session (1)'));

        if(row1.length <= 0) return callback(new Error('An error occurred while registering user session (2)'));

        var extendedSession = haveRankPermission('extended_session', row1[0].rank);
        var expiresIn = extendedSession ? config.app.auth.session.expire.extended : config.app.auth.session.expire.normal;

        var device = crypto.createHash('sha256').update(data.agent).digest('hex');

        pool.query('SELECT `id`, `session` FROM `users_sessions` WHERE `userid` = ' + pool.escape(data.userid) + ' AND `device` = ' + pool.escape(device) + ' AND `removed` = 0 AND `expire` > ' + pool.escape(time()), function(err2, row2) {
            if(err2) return callback(new Error('An error occurred while registering user session (3)'));

            if(row2.length > 0) {
                return getLocationByIp(data.ip, function(err3, response3){
                    if(err3) return callback(err3);

                    var location = [ response3.city, response3.region, response3.country ].join(', ');

                    pool.query('INSERT INTO `users_logins` SET `type` = ' + pool.escape(data.type) + ', `userid` = ' + pool.escape(data.userid) + ', `sessionid` = ' + pool.escape(row2[0].id) + ', `ip` = ' + pool.escape(data.ip) + ', `agent` = ' + pool.escape(data.agent) + ', `location` = ' + pool.escape(location) + ', `time` = ' + pool.escape(time()), function(err4, row4) {
                        if(err4) return callback(new Error('An error occurred while registering user session (4)'));

                        if(row4.affectedRows <= 0) return callback(new Error('An error occurred while registering user session (5)'));

                        callback(null, row2[0].session, extendedSession);
                    });
                });
            }

            var session = generateSessionToken();

            pool.query('INSERT INTO `users_sessions` SET `userid` = ' + pool.escape(data.userid) + ', `session` = ' + pool.escape(session) + ', `device` = ' + pool.escape(device) + ', `expire` = ' + pool.escape(time() + expiresIn) + ', `time` = ' + pool.escape(time()), function(err3, row3) {
                if(err3) return callback(new Error('An error occurred while registering user session (6)'));

                if(row3.affectedRows <= 0) return callback(new Error('An error occurred while registering user session (7)'));

                getLocationByIp(data.ip, function(err4, response4){
                    if(err4) return callback(err4);

                    var location = [ response4.city, response4.region, response4.country ].join(', ');

                    pool.query('INSERT INTO `users_logins` SET `type` = ' + pool.escape(data.type) + ', `userid` = ' + pool.escape(data.userid) + ', `sessionid` = ' + pool.escape(row3.insertId) + ', `ip` = ' + pool.escape(data.ip) + ', `agent` = ' + pool.escape(data.agent) + ', `location` = ' + pool.escape(location) + ', `time` = ' + pool.escape(time()), function(err5, row5) {
                        if(err5) return callback(new Error('An error occurred while registering user session (8)'));

                        if(row5.affectedRows <= 0) return callback(new Error('An error occurred while registering user session (9)'));

                        callback(null, session, extendedSession);
                    });
                });
            });
        });
    });
}

function bindAccount(data, callback) {
    if(config.settings.server.binds[data.bind] === undefined || !config.settings.server.binds[data.bind]) return callback(new Error('Invalid bind'));

    pool.query('SELECT * FROM `users_binds` WHERE `userid` = ' + pool.escape(data.userid) + ' AND `bind` = ' + pool.escape(data.bind) + ' AND `removed` = 0', function (err1, row1) {
        if(err1) return callback(new Error('An error occurred while binding account (1)'));

        if(row1.length > 0) return callback(new Error('User is already binded to this account'));

        pool.query('SELECT * FROM `users_binds` WHERE `bind` = ' + pool.escape(data.bind) + ' AND `bindid` = ' + pool.escape(data.id) + ' AND `removed` = 0', function (err2, row2) {
            if(err2) return callback(new Error('An error occurred while binding account (2)'));

            if(row2.length > 0) return callback(new Error('Account already binded to another user'));

            pool.query('INSERT INTO `users_binds` SET `userid` = ' + pool.escape(data.userid) + ', `bind` = ' + pool.escape(data.bind) + ', `bindid` = ' + pool.escape(data.id) + ', `time` = ' + pool.escape(time()), function (err3, row3) {
                if(err3) return callback(new Error('An error occurred while binding account (3)'));

                if(row3.affectedRows <= 0) return callback(new Error('An error occurred while binding account (4)'));

                return callback(null);
            });
        });
    });
}

function authWithLogin(data, callback) {
    var email = data.email.toLowerCase();
    var crypted_password = crypto.createHash('sha256').update(data.password).digest('hex');

    pool.query('SELECT `userid` FROM `users` WHERE `email` = ' + pool.escape(email) + ' AND `password` = ' + pool.escape(crypted_password), function(err1, row1) {
        if(err1) return callback(new Error('An error occurred while authing with login (1)'));

        if(row1.length <= 0) return callback(new Error('Invalid email or password'));

        checkTwofa(row1[0].userid, function(err2, twofa){
            if(err2) return callback(err2);

            if(!twofa) return callback(null, null, row1[0].userid);

            generateAuthRequest(row1[0].userid, function(err3, token){
                if(err3) return callback(err3);

                callback(null, token);
            });
        });
    });
}

function authWithRegister(data, callback) {
    var pattern_name = /^.{2,64}$/;
    var pattern_email = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*\.\w+$/;
    var pattern_password = /^(?=.*\d)(?=.*[A-Z])(?=.*[a-z])(?=.*\W).{8,64}$/;

    if(!pattern_name.test(data.name)) return callback(new Error('Invalid name. At least 2 characters, maximum 64 characters'));
    if(!pattern_email.test(data.email)) return callback(new Error('Invalid email. Invalid format email'));
    if(!pattern_password.test(data.password)) return callback(new Error('Invalid password. At least 8 characters, maximum 64 characters, one uppercase, one lowercase, one number and one symbol'));
    if(data.confirm_password != data.password) return callback(new Error('Invalid password. The passwords doesn\'t match'));

    var email = data.email.toLowerCase();

    pool.query('SELECT * FROM `users` WHERE `email` = ' + pool.escape(email), function(err1, row1) {
        if(err1) return callback(new Error('An error occurred while authing with register (1)'));

        if(row1.length > 0) return callback(new Error('Email already taken'));

        var userid = uuid.uuidv4();
        var crypted_password = crypto.createHash('sha256').update(data.password).digest('hex');

        var avatar = config.app.url + '/img/avatar.jpg';
        var name = escapeHTML(data.name);

        pool.query('INSERT INTO `users` SET `userid` = ' + pool.escape(userid) + ', `email` = ' + pool.escape(email) + ', `password` = ' + pool.escape(crypted_password) + ', `name` = ' + pool.escape(name) + ', `avatar` = ' + pool.escape(avatar) + ', `time_create` = ' + pool.escape(time()), function(err2, row2) {
            if(err2) return callback(new Error('An error occurred while authing with register (2)'));

            if(row2.affectedRows <= 0) return callback(new Error('An error occurred while authing with register (3)'));

            var changes = [
                { name: 'name', value: name },
                { name: 'email', value: email },
                { name: 'password', value: crypted_password }
            ];

            registerChanged(userid, 0, changes, function(err3){
                if(err3) return callback(err3);

                var client_seed = generateHexCode(32);
                var server_seed = generateHexCode(64);

                pool.query('INSERT INTO `users_seeds_client` SET `userid` = ' + pool.escape(userid) + ', `seed` = ' + pool.escape(client_seed) + ', `time` = ' + pool.escape(time()), function(err4, row4) {
                    if(err4) return callback(new Error('An error occurred while authing with register (4)'));

                    if(row4.affectedRows <= 0) return callback(new Error('An error occurred while authing with register (5)'));

                    pool.query('INSERT INTO `users_seeds_server` SET `userid` = ' + pool.escape(userid) + ', `seed` = ' + pool.escape(server_seed) + ', `time` = ' + pool.escape(time()), function(err5, row5) {
                        if(err5) return callback(new Error('An error occurred while authing with register (6)'));

                        if(row5.affectedRows <= 0) return callback(new Error('An error occurred while authing with register (7)'));

                        callback(null, null, userid);
                    });
                });
            });
        });
    });
}

function authWithGoogle(data, callback) {
    pool.query('SELECT `userid` FROM `users_binds` WHERE `bind` = ' + pool.escape('google') + ' AND `bindid` = ' + pool.escape(data.id) + ' AND `removed` = 0', function(err1, row1) {
        if(err1) return callback(new Error('An error occurred while authing with google (1)'));

        if(row1.length > 0) return loginWithGoogle({ ...{ userid: row1[0].userid }, ...data }, callback);

        var pattern_email = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*\.\w+$/;
        if(!pattern_email.test(data.email)) return callback(new Error('Invalid email. Invalid format email'));

        var email = data.email.toLowerCase();

        pool.query('SELECT * FROM `users` WHERE `email` = ' + pool.escape(email), function(err2, row2) {
            if(err2) return callback(new Error('An error occurred while authing with google (2)'));

            if(row2.length <= 0) return registerWithGoogle(data, callback);

            bindWithGoogle({ ...{ userid: row2[0].userid }, ...data }, callback);
        });
    });
}

/* ----- INTERNAL USAGE ----- */
function loginWithGoogle(data, callback){
    var name = escapeHTML(data.name);

    pool.query('UPDATE `users` SET `name` = ' + pool.escape(name) + ', `avatar` = ' + pool.escape(data.avatar) + ' WHERE `userid` = ' + pool.escape(data.userid), function(err1) {
        if(err1) return callback(new Error('An error occurred while logging with google (1)'));

        var changes = [
            { name: 'name', value: name },
            { name: 'avatar', value: data.avatar }
        ];

        registerChanged(data.userid, 0, changes, function(err2){
            if(err2) return callback(err2);

            checkTwofa(data.userid, function(err3, twofa){
                if(err3) return callback(err3);

                if(!twofa) return callback(null, null, data.userid);

                generateAuthRequest(data.userid, function(err4, token){
                    if(err4) return callback(err4);

                    callback(null, token);
                });
            });
        });
    });
}

/* ----- INTERNAL USAGE ----- */
function registerWithGoogle(data, callback){
    var userid = uuid.uuidv4();

    var name = escapeHTML(data.name);
    var email = data.email.toLowerCase();

    pool.query('INSERT INTO `users` SET `userid` = ' + pool.escape(userid) + ', `email` = ' + pool.escape(email) + ', `name` = ' + pool.escape(name) + ', `avatar` = ' + pool.escape(data.avatar) + ', `time_create` = ' + pool.escape(time()), function(err1, row1) {
        if(err1) return callback(new Error('An error occurred while registering with google (1)'));

        if(row1.affectedRows <= 0) return callback(new Error('An error occurred while registering with google (2)'));

        pool.query('INSERT INTO `users_binds` SET `userid` = ' + pool.escape(userid) + ', `bind` = ' + pool.escape('google') + ', `bindid` = ' + pool.escape(data.id) + ', `time` = ' + pool.escape(time()), function(err2, row2) {
            if(err2) return callback(new Error('An error occurred while registering with google (3)'));

            if(row2.affectedRows <= 0) return callback(new Error('An error occurred while registering with google (4)'));

            var changes = [
                { name: 'email', value: email },
                { name: 'name', value: name },
                { name: 'avatar', value: data.avatar }
            ];

            registerChanged(userid, 0, changes, function(err3){
                if(err3) return callback(err3);

                var client_seed = generateHexCode(32);
                var server_seed = generateHexCode(64);

                pool.query('INSERT INTO `users_seeds_client` SET `userid` = ' + pool.escape(userid) + ', `seed` = ' + pool.escape(client_seed) + ', `time` = ' + pool.escape(time()), function(err4, row4) {
                    if(err4) return callback(new Error('An error occurred while registering with google (5)'));

                    if(row4.affectedRows <= 0) return callback(new Error('An error occurred while registering with google (6)'));

                    pool.query('INSERT INTO `users_seeds_server` SET `userid` = ' + pool.escape(userid) + ', `seed` = ' + pool.escape(server_seed) + ', `time` = ' + pool.escape(time()), function(err5, row5) {
                        if(err5) return callback(new Error('An error occurred while registering with google (7)'));

                        if(row5.affectedRows <= 0) return callback(new Error('An error occurred while registering with google (8)'));

                        callback(null, null, userid);
                    });
                });
            });
        });
    });
}

/* ----- INTERNAL USAGE ----- */
function bindWithGoogle(data, callback){
    if(config.settings.server.binds.google === undefined || !config.settings.server.binds.google) return callback(new Error('Invalid bind'));

    pool.query('SELECT * FROM `users_binds` WHERE `userid` = ' + pool.escape(data.userid) + ' AND `bind` = ' + pool.escape('google') + ' AND `removed` = 0', function(err1, row1) {
        if(err1) return callback(new Error('An error occurred while binding with google (1)'));

        if(row1.length > 0) return callback(new Error('Google account already binded to another user'));

        var name = escapeHTML(data.name);

        pool.query('UPDATE `users` SET `name` = ' + pool.escape(name) + ', `avatar` = ' + pool.escape(data.avatar) + ' WHERE `userid` = ' + pool.escape(data.userid), function(err2) {
            if(err2) return callback(new Error('An error occurred while binding with google (2)'));

            pool.query('INSERT INTO `users_binds` SET `userid` = ' + pool.escape(data.userid) + ', `bind` = ' + pool.escape('google') + ', `bindid` = ' + pool.escape(data.id) + ', `time` = ' + pool.escape(time()), function(err3, row3) {
                if(err3) return callback(new Error('An error occurred while binding with google (3)'));

                if(row3.affectedRows <= 0) return callback(new Error('An error occurred while binding with google (4)'));

                var changes = [
                    { name: 'name', value: name },
                    { name: 'avatar', value: data.avatar }
                ];

                registerChanged(data.userid, 0, changes, function(err4){
                    if(err4) return callback(err4);

                    checkTwofa(data.userid, function(err5, twofa){
                        if(err5) return callback(err5);

                        if(!twofa) return callback(null, null, data.userid);

                        generateAuthRequest(data.userid, function(err6, token){
                            if(err6) return callback(err6);

                            callback(null, token);
                        });
                    });
                });
            });
        });
    });
}

function authWithDiscord(data, callback) {
    pool.query('SELECT `userid` FROM `users_binds` WHERE `bind` = ' + pool.escape('discord') + ' AND `bindid` = ' + pool.escape(data.id) + ' AND `removed` = 0', function(err1, row1) {
        if(err1) return callback(new Error('An error occurred while authing with discord (1)'));

        if(row1.length > 0) return loginWithDiscord({ ...{ userid: row1[0].userid }, ...data }, callback);

        var pattern_email = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*\.\w+$/;
        if(!pattern_email.test(data.email)) return callback(new Error('Invalid email. Invalid format email'));

        var email = data.email.toLowerCase();

        pool.query('SELECT * FROM `users` WHERE `email` = ' + pool.escape(email), function(err2, row2) {
            if(err2) return callback(new Error('An error occurred while authing with discord (2)'));

            if(row2.length <= 0) return registerWithDiscord(data, callback);

            bindWithDiscord({ ...{ userid: row2[0].userid }, ...data }, callback);
        });
    });
}

/* ----- INTERNAL USAGE ----- */
function loginWithDiscord(data, callback){
    var name = escapeHTML(data.name);

    pool.query('UPDATE `users` SET `name` = ' + pool.escape(name) + ', `avatar` = ' + pool.escape(data.avatar) + ' WHERE `userid` = ' + pool.escape(data.userid), function(err1) {
        if(err1) return callback(new Error('An error occurred while logging with discord (1)'));

        var changes = [
            { name: 'name', value: name },
            { name: 'avatar', value: data.avatar }
        ];

        registerChanged(data.userid, 0, changes, function(err2){
            if(err2) return callback(err2);

            checkTwofa(data.userid, function(err3, twofa){
                if(err3) return callback(err3);

                if(!twofa) return callback(null, null, data.userid);

                generateAuthRequest(data.userid, function(err4, token){
                    if(err4) return callback(err4);

                    callback(null, token);
                });
            });
        });
    });
}

/* ----- INTERNAL USAGE ----- */
function registerWithDiscord(data, callback){
    var userid = uuid.uuidv4();

    var name = escapeHTML(data.name);
    var email = data.email.toLowerCase();

    pool.query('INSERT INTO `users` SET `userid` = ' + pool.escape(userid) + ', `email` = ' + pool.escape(email) + ', `name` = ' + pool.escape(name) + ', `avatar` = ' + pool.escape(data.avatar) + ', `time_create` = ' + pool.escape(time()), function(err1, row1) {
        if(err1) return callback(new Error('An error occurred while registering with discord (1)'));

        if(row1.affectedRows <= 0) return callback(new Error('An error occurred while registering with discord (2)'));

        pool.query('INSERT INTO `users_binds` SET `userid` = ' + pool.escape(userid) + ', `bind` = ' + pool.escape('discord') + ', `bindid` = ' + pool.escape(data.id) + ', `time` = ' + pool.escape(time()), function(err2, row2) {
            if(err2) return callback(new Error('An error occurred while registering with discord (3)'));

            if(row2.affectedRows <= 0) return callback(new Error('An error occurred while registering with discord (4)'));

            var changes = [
                { name: 'email', value: email },
                { name: 'name', value: name },
                { name: 'avatar', value: data.avatar }
            ];

            registerChanged(userid, 0, changes, function(err3){
                if(err3) return callback(err3);

                var client_seed = generateHexCode(32);
                var server_seed = generateHexCode(64);

                pool.query('INSERT INTO `users_seeds_client` SET `userid` = ' + pool.escape(userid) + ', `seed` = ' + pool.escape(client_seed) + ', `time` = ' + pool.escape(time()), function(err4, row4) {
                    if(err4) return callback(new Error('An error occurred while registering with discord (5)'));

                    if(row4.affectedRows <= 0) return callback(new Error('An error occurred while registering with discord (6)'));

                    pool.query('INSERT INTO `users_seeds_server` SET `userid` = ' + pool.escape(userid) + ', `seed` = ' + pool.escape(server_seed) + ', `time` = ' + pool.escape(time()), function(err5, row5) {
                        if(err5) return callback(new Error('An error occurred while registering with discord (7)'));

                        if(row5.affectedRows <= 0) return callback(new Error('An error occurred while registering with discord (8)'));

                        callback(null, null, userid);
                    });
                });
            });
        });
    });
}

/* ----- INTERNAL USAGE ----- */
function bindWithDiscord(data, callback){
    if(config.settings.server.binds.discord === undefined || !config.settings.server.binds.discord) return callback(new Error('Invalid bind'));

    pool.query('SELECT * FROM `users_binds` WHERE `userid` = ' + pool.escape(data.userid) + ' AND `bind` = ' + pool.escape('discord') + ' AND `removed` = 0', function(err1, row1) {
        if(err1) return callback(new Error('An error occurred while binding with discord (1)'));

        if(row1.length > 0) return callback(new Error('Discord account already binded to another user'));

        var name = escapeHTML(data.name);

        pool.query('UPDATE `users` SET `name` = ' + pool.escape(name) + ', `avatar` = ' + pool.escape(data.avatar) + ' WHERE `userid` = ' + pool.escape(data.userid), function(err2) {
            if(err2) return callback(new Error('An error occurred while binding with discord (2)'));

            pool.query('INSERT INTO `users_binds` SET `userid` = ' + pool.escape(data.userid) + ', `bind` = ' + pool.escape('discord') + ', `bindid` = ' + pool.escape(data.id) + ', `time` = ' + pool.escape(time()), function(err3, row3) {
                if(err3) return callback(new Error('An error occurred while binding with discord (3)'));

                if(row3.affectedRows <= 0) return callback(new Error('An error occurred while binding with discord (4)'));

                var changes = [
                    { name: 'name', value: name },
                    { name: 'avatar', value: data.avatar }
                ];

                registerChanged(data.userid, 0, changes, function(err4){
                    if(err4) return callback(err4);

                    checkTwofa(data.userid, function(err5, twofa){
                        if(err5) return callback(err5);

                        if(!twofa) return callback(null, null, data.userid);

                        generateAuthRequest(data.userid, function(err6, token){
                            if(err6) return callback(err6);

                            callback(null, token);
                        });
                    });
                });
            });
        });
    });
}

function authWithSteam(data, callback) {
    pool.query('SELECT `userid` FROM `users_binds` WHERE `bind` = ' + pool.escape('steam') + ' AND `bindid` = ' + pool.escape(data.id) + ' AND `removed` = 0', function(err1, row1) {
        if(err1) return callback(new Error('An error occurred while authing with steam (1)'));

        if(row1.length > 0) return loginWithSteam({ ...{ userid: row1[0].userid }, ...data }, callback);

        registerWithSteam(data, callback);
    });
}

/* ----- INTERNAL USAGE ----- */
function loginWithSteam(data, callback){
    var name = escapeHTML(data.name);

    pool.query('UPDATE `users` SET `name` = ' + pool.escape(name) + ', `avatar` = ' + pool.escape(data.avatar) + ' WHERE `userid` = ' + pool.escape(data.userid), function(err1) {
        if(err1) return callback(new Error('An error occurred while logging with steam (1)'));

        var changes = [
            { name: 'name', value: name },
            { name: 'avatar', value: data.avatar }
        ];

        registerChanged(data.userid, 0, changes, function(err2){
            if(err2) return callback(err2);

            checkTwofa(data.userid, function(err3, twofa){
                if(err3) return callback(err3);

                if(!twofa) return callback(null, null, data.userid);

                generateAuthRequest(data.userid, function(err4, token){
                    if(err4) return callback(err4);

                    callback(null, token);
                });
            });
        });
    });
}

/* ----- INTERNAL USAGE ----- */
function registerWithSteam(data, callback){
    var userid = uuid.uuidv4();

    var name = escapeHTML(data.name);

    pool.query('INSERT INTO `users` SET `userid` = ' + pool.escape(userid) + ', `name` = ' + pool.escape(name) + ', `avatar` = ' + pool.escape(data.avatar) + ', `time_create` = ' + pool.escape(time()), function(err1, row1) {
        if(err1) return callback(new Error('An error occurred while registering with steam (1)'));

        if(row1.affectedRows <= 0) return callback(new Error('An error occurred while registering with steam (2)'));

        pool.query('INSERT INTO `users_binds` SET `userid` = ' + pool.escape(userid) + ', `bind` = ' + pool.escape('steam') + ', `bindid` = ' + pool.escape(data.id) + ', `time` = ' + pool.escape(time()), function(err2, row2) {
            if(err2) return callback(new Error('An error occurred while registering with steam (3)'));

            if(row2.affectedRows <= 0) return callback(new Error('An error occurred while registering with steam (4)'));

            var changes = [
                { name: 'name', value: name },
                { name: 'avatar', value: data.avatar }
            ];

            registerChanged(userid, 0, changes, function(err3){
                if(err3) return callback(err3);

                var client_seed = generateHexCode(32);
                var server_seed = generateHexCode(64);

                pool.query('INSERT INTO `users_seeds_client` SET `userid` = ' + pool.escape(userid) + ', `seed` = ' + pool.escape(client_seed) + ', `time` = ' + pool.escape(time()), function(err4, row4) {
                    if(err4) return callback(new Error('An error occurred while registering with steam (5)'));

                    if(row4.affectedRows <= 0) return callback(new Error('An error occurred while registering with steam (6)'));

                    pool.query('INSERT INTO `users_seeds_server` SET `userid` = ' + pool.escape(userid) + ', `seed` = ' + pool.escape(server_seed) + ', `time` = ' + pool.escape(time()), function(err5, row5) {
                        if(err5) return callback(new Error('An error occurred while registering with steam (7)'));

                        if(row5.affectedRows <= 0) return callback(new Error('An error occurred while registering with steam (8)'));

                        callback(null, null, userid);
                    });
                });
            });
        });
    });
}

function forgotPassword(data, callback){
    var pattern_email = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*\.\w+$/;

    if(!pattern_email.test(data.email)) return callback(new Error('Invalid email. Invalid format email'));

    var email = data.email.toLowerCase();

    pool.query('UPDATE `users_recovery_requests` SET `removed` = 1 WHERE `email` = ' + pool.escape(email) + ' AND `used` = 0 AND `removed` = 0 AND `expire` > ' + pool.escape(time()), function(err1) {
        if(err1) return callback(new Error('An error occurred while forgetting password (1)'));

        var token = generateHexCode(32);

        pool.query('INSERT INTO `users_recovery_requests` SET `email` = ' + pool.escape(email) + ', `token` = ' + pool.escape(token) + ', `expire` = ' + pool.escape(time() + config.app.auth.expire.token.recover) + ', `time` = ' + pool.escape(time()), function(err2, row2) {
            if(err2) return callback(new Error('An error occurred while forgetting password (2)'));

            if(row2.affectedRows <= 0) return callback(new Error('An error occurred while forgetting password (3)'));

            var subject = 'Reset Password';
            var message = 'Reset Password Link (expire in ' + Math.floor(config.app.auth.expire.token.recover / 60) + ' minutes): ' + config.app.url + '/login/reset-password?returnUrl=' + data.returnUrl + '&token=' + token;

            mailerService.sendMail(email, subject, message, function(err3) {
                if(err3) return callback(err3);

                pool.query('INSERT INTO `email_history` SET `email` = ' + pool.escape(email) + ', `subject` = ' + pool.escape(subject) + ', `message` = ' + pool.escape(message) + ', `time` = ' + pool.escape(time()), function(err4, row4) {
                    if(err4) return callback(new Error('An error occurred while forgetting password (4)'));

                    if(row4.affectedRows <= 0) return callback(new Error('An error occurred while forgetting password (5)'));

                    callback(null);
                });
            });
        });
    });
}

function resetPassword(data, callback) {
    var pattern_password = /^(?=.*\d)(?=.*[A-Z])(?=.*[a-z])(?=.*\W).{8,64}$/;

    if(!pattern_password.test(data.password)) return callback(new Error('Invalid password. At least 8 characters, maximum 64 characters, one uppercase, one lowercase, one number and one symbol')); // ERROR
    if(data.password != data.confirm_password) return callback(new Error('The passwords does not match'));

    pool.query('SELECT `email` FROM `users_recovery_requests` WHERE `token` = ' + pool.escape(data.token) + ' AND `removed` = 0 AND `used` = 0 AND `expire` > ' + pool.escape(time()), function(err1, row1) {
        if(err1) return callback(new Error('An error occurred while reseting password (1)'));

        if(row1.length <= 0) return callback(new Error('An error occurred while reseting password (2)'));

        pool.query('UPDATE `users_recovery_requests` SET `used` = 1 WHERE `token` = ' + pool.escape(data.token) + ' AND `removed` = 0 AND `used` = 0 AND `expire` > ' + pool.escape(time()), function(err2, row2) {
            if(err2) return callback(new Error('An error occurred while reseting password (3)'));

            if(row2.affectedRows <= 0) return callback(new Error('An error occurred while reseting password (4)'));

            pool.query('SELECT `userid` FROM `users` WHERE `email` = ' + pool.escape(row1[0].email), function(err3, row3) {
                if(err3) return callback(new Error('An error occurred while reseting password (5)'));

                if(row3.length <= 0) return callback(new Error('An error occurred while reseting password (6)'));

                var crypted_password = crypto.createHash('sha256').update(data.password).digest('hex');

                pool.query('UPDATE `users` SET `password` = ' + pool.escape(crypted_password) + ' WHERE `userid` = ' + pool.escape(row3[0].userid), function(err4) {
                    if(err4) return callback(new Error('An error occurred while reseting password (7)'));

                    var changes = [
                        { name: 'password', value: crypted_password }
                    ];

                    registerChanged(row3[0].userid, 0, changes, function(err5){
                        if(err5) return callback(err5);

                        callback(null);
                    });
                });
            });
        });
    });
}

function logout(data, callback) {
    var device = crypto.createHash('sha256').update(data.agent).digest('hex');

    pool.query('UPDATE `users_sessions` SET `removed` = 1 WHERE `userid` = ' + pool.escape(data.userid) + ' AND `session` = ' + pool.escape(data.session) + ' AND `device` = ' + pool.escape(device) + ' AND `removed` = 0 AND `expire` > ' + pool.escape(time()), function(err1, row1) {
        if(err1) return callback(new Error('An error occurred while logging out (1)'));

        if(row1.affectedRows <= 0) return callback(new Error('An error occurred while logging out (2)'));

        callback(null);
    });
}

function changePassword(data, callback){
    var pattern_password = /^(?=.*\d)(?=.*[A-Z])(?=.*[a-z])(?=.*\W).{8,64}$/;

    if(!pattern_password.test(data.current_password)) return callback(new Error('Invalid current password. At least 8 characters, maximum 64 characters, one uppercase, one lowercase, one number and one symbol'));
    if(!pattern_password.test(data.password)) return callback(new Error('Invalid new password. At least 8 characters, maximum 64 characters, one uppercase, one lowercase, one number and one symbol'));
    if(data.confirm_password != data.password) return callback(new Error('Invalid password. The passwords doesn\'t match'));

    var device = crypto.createHash('sha256').update(data.agent).digest('hex');

    pool.query('SELECT * FROM `users_security_requests` WHERE `userid` = ' + pool.escape(data.userid) + ' AND `device` = ' + pool.escape(device) + ' AND `removed` = 0 AND `expire` > ' + pool.escape(time()), function(err1, row1) {
        if(err1) return callback(new Error('An error occurred while changing password (1)'));

        if(row1.length <= 0) return callback(new Error('Your identity verification session expired. Please refresh the page!'));

        pool.query('SELECT `password` FROM `users` WHERE `userid` = ' + pool.escape(data.userid), function(err2, row2) {
            if(err2) return callback(new Error('An error occurred while changing password (2)'));

            if(row2.length <= 0) return callback(new Error('An error occurred while changing password (3)'));

            var crypted_current_password = crypto.createHash('sha256').update(data.current_password).digest('hex');
            if(crypted_current_password != row2[0].password) return callback(new Error('Invalid current password. Wrong password'));

            var crypted_new_password = crypto.createHash('sha256').update(data.password).digest('hex');
            if(crypted_new_password == row2[0].password) return callback(new Error('Invalid new password. Same password'));

            pool.query('UPDATE `users` SET `password` = ' + pool.escape(crypted_new_password) + ' WHERE `userid` = ' + pool.escape(data.userid), function(err3, row3) {
                if(err3) return callback(new Error('An error occurred while changing password (4)'));

                if(row3.affectedRows <= 0) return callback(new Error('An error occurred while changing password (5)'));

                var changes = [
                    { name: 'password', value: crypted_new_password }
                ];

                registerChanged(data.userid, 0, changes, function(err4){
                    if(err4) return callback(err4);

                    callback(null);
                });
            });
        });
    });
}

function changeEmail(data, callback){
    var device = crypto.createHash('sha256').update(data.agent).digest('hex');

    pool.query('SELECT * FROM `users_security_requests` WHERE `userid` = ' + pool.escape(data.userid) + ' AND `device` = ' + pool.escape(device) + ' AND `removed` = 0 AND `expire` > ' + pool.escape(time()), function(err1, row1) {
        if(err1) return callback(new Error('An error occurred while changing email (1)'));

        if(row1.length <= 0) return callback(new Error('Your identity verification session expired. Please refresh the page!'));

        pool.query('SELECT `userid`, `email` FROM `users_email_change_requests` WHERE `token` = ' + pool.escape(data.token) + ' AND `removed` = 0 AND `used` = 0 AND `expire` > ' + pool.escape(time()), function(err2, row2) {
            if(err2) return callback(new Error('An error occurred while changing email (2)'));

            if(row2.length <= 0) return callback(new Error('An error occurred while changing email (3)'));

            pool.query('UPDATE `users_email_change_requests` SET `used` = 1 WHERE `token` = ' + pool.escape(data.token) + ' AND `removed` = 0 AND `used` = 0 AND `expire` > ' + pool.escape(time()), function(err3, row3) {
                if(err3) return callback(new Error('An error occurred while changing email (4)'));

                if(row3.affectedRows <= 0) return callback(new Error('An error occurred while changing email (5)'));

                pool.query('UPDATE `users` SET `email` = ' + pool.escape(row2[0].email) + ' WHERE `userid` = ' + pool.escape(row2[0].userid), function(err4) {
                    if(err4) return callback(new Error('An error occurred while changing email (6)'));

                    var changes = [
                        { name: 'email', value: row2[0].email }
                    ];

                    registerChanged(row2[0].userid, 0, changes, function(err5){
                        if(err5) return callback(err5);

                        callback(null);
                    });
                });
            });
        });
    });
}

function setPassword(data, callback){
    var pattern_password = /^(?=.*\d)(?=.*[A-Z])(?=.*[a-z])(?=.*\W).{8,64}$/;

    if(!pattern_password.test(data.password)) return callback(new Error('Invalid new password. At least 8 characters, maximum 64 characters, one uppercase, one lowercase, one number and one symbol'));
    if(data.confirm_password != data.password) return callback(new Error('Invalid password. The passwords doesn\'t match'));

    var crypted_new_password = crypto.createHash('sha256').update(data.password).digest('hex');

    pool.query('UPDATE `users` SET `password` = ' + pool.escape(crypted_new_password) + ' WHERE `userid` = ' + pool.escape(data.userid), function(err1, row1) {
        if(err1) return callback(new Error('An error occurred while setting password (1)'));

        if(row1.affectedRows <= 0) return callback(new Error('An error occurred while setting password (2)'));

        var changes = [
            { name: 'password', value: crypted_new_password }
        ];

        registerChanged(data.userid, 0, changes, function(err2){
            if(err2) return callback(err2);

            callback(null);
        });
    });
}

function setEmailRequest(data, callback){
    var pattern_email = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*\.\w+$/;

    if(!pattern_email.test(data.email)) return callback(new Error('Invalid email. Invalid format email'));

    var email = data.email.toLowerCase();

    pool.query('SELECT * FROM `users` WHERE `email` = ' + pool.escape(email) + ' AND `userid` != ' + pool.escape(data.userid), function(err1, row1) {
        if(err1) return callback(new Error('An error occurred while setting email request (1)'));

        if(row1.length > 0) return callback(new Error('Invalid email! Email already taken!'));

        pool.query('UPDATE `users_email_set_requests` SET `removed` = 1 WHERE `userid` = ' + pool.escape(data.userid) + ' AND `used` = 0 AND `removed` = 0 AND `expire` > ' + pool.escape(time()), function(err2) {
            if(err2) return callback(new Error('An error occurred while setting email request (2)'));

            var token = generateHexCode(32);

            pool.query('INSERT INTO `users_email_set_requests` SET `userid` = ' + pool.escape(data.userid) + ', `email` = ' + pool.escape(email) + ', `token` = ' + pool.escape(token) + ', `expire` = ' + pool.escape(time() + config.app.auth.expire.token.email_validation) + ', `time` = ' + pool.escape(time()), function(err3, row3) {
                if(err3) return callback(new Error('An error occurred while setting email request (3)'));

                if(row3.affectedRows <= 0) return callback(new Error('An error occurred while setting email request (4)'));

                var subject = 'Set Email';
                var message = 'Set Email Confirmation (expire in ' + Math.floor(config.app.auth.expire.token.email_validation / 60) + ' minutes): ' + config.app.url + '/auth/set-email?returnUrl=' + data.returnUrl + '&token=' + token;

                mailerService.sendMail(email, subject, message, function(err4) {
                    if(err4) return callback(err4);

                    pool.query('INSERT INTO `email_history` SET `email` = ' + pool.escape(email) + ', `subject` = ' + pool.escape(subject) + ', `message` = ' + pool.escape(message) + ', `time` = ' + pool.escape(time()), function(err5, row5) {
                        if(err5) return callback(new Error('An error occurred while setting email request (5)'));

                        if(row5.affectedRows <= 0) return callback(new Error('An error occurred while setting email request (6)'));

                        callback(null, token);
                    });
                });
            });
        });
    });
}

function setEmail(data, callback){
    pool.query('SELECT `userid`, `email` FROM `users_email_set_requests` WHERE `token` = ' + pool.escape(data.token) + ' AND `removed` = 0 AND `used` = 0 AND `expire` > ' + pool.escape(time()), function(err1, row1) {
        if(err1) return callback(new Error('An error occurred while setting email (1)'));

        if(row1.length <= 0) return callback(new Error('An error occurred while setting email (2)'));

        pool.query('UPDATE `users_email_set_requests` SET `used` = 1 WHERE `token` = ' + pool.escape(data.token) + ' AND `removed` = 0 AND `used` = 0 AND `expire` > ' + pool.escape(time()), function(err2, row2) {
            if(err2) return callback(new Error('An error occurred while setting email (3)'));

            if(row2.affectedRows <= 0) return callback(new Error('An error occurred while setting email (4)'));

            pool.query('UPDATE `users` SET `email` = ' + pool.escape(row1[0].email) + ' WHERE `userid` = ' + pool.escape(row1[0].userid), function(err3) {
                if(err3) return callback(new Error('An error occurred while setting email (5)'));

                var changes = [
                    { name: 'email', value: row1[0].email }
                ];

                registerChanged(row1[0].userid, 0, changes, function(err4){
                    if(err4) return callback(err4);

                    callback(null);
                });
            });
        });
    });
}

function authorizeAccountIdentity(data, callback){
    var pattern_password = /^(?=.*\d)(?=.*[A-Z])(?=.*[a-z])(?=.*\W).{8,64}$/;

    if(!pattern_password.test(data.password)) return callback(new Error('Invalid current password. At least 8 characters, maximum 64 characters, one uppercase, one lowercase, one number and one symbol'));

    pool.query('SELECT `password` FROM `users` WHERE `userid` = ' + pool.escape(data.userid), function(err1, row1) {
        if(err1) return callback(new Error('An error occurred while authorizing account identity (1)'));

        if(row1.length <= 0) return callback(new Error('An error occurred while authorizing account identity (2)'));

        var crypted_password = crypto.createHash('sha256').update(data.password).digest('hex');
        if(crypted_password != row1[0].password) return callback(new Error('Invalid password. Wrong password'));

        generateAccountRequest({
            userid: data.userid,
            agent: data.agent
        }, function(err2){
            if(err2) return callback(err2);

            callback(null);
        });
    });
}

function authorizeAdminIdentity(data, callback){
    var pattern_password = /^(?=.*\d)(?=.*[A-Z])(?=.*[a-z])(?=.*\W).{8,64}$/;

    if(!pattern_password.test(data.password)) return callback(new Error('Invalid current password. At least 8 characters, maximum 64 characters, one uppercase, one lowercase, one number and one symbol'));

    pool.query('SELECT `password` FROM `users` WHERE `userid` = ' + pool.escape(data.userid), function(err1, row1) {
        if(err1) return callback(new Error('An error occurred while authorizing admin identity (1)'));

        if(row1.length <= 0) return callback(new Error('An error occurred while authorizing admin identity (2)'));

        var crypted_password = crypto.createHash('sha256').update(data.password).digest('hex');
        if(crypted_password != row1[0].password) return callback(new Error('Invalid password. Wrong password'));

        generateAdminRequest({
            userid: data.userid,
            agent: data.agent
        }, function(err2){
            if(err2) return callback(err2);

            callback(null);
        });
    });
}

module.exports = {
    generateAccountRequest, generateAdminRequest,
    registerUserSession,
    bindAccount,
    authWithLogin, authWithRegister,
    authWithGoogle, authWithDiscord, authWithSteam,
    forgotPassword, resetPassword,
    logout,
    changePassword, changeEmail,
    setPassword, setEmailRequest, setEmail,
    authorizeAccountIdentity, authorizeAdminIdentity
};