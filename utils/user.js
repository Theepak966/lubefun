var { pool } = require('@/lib/database.js');
var { time } = require('@/utils/formatDate.js');

function getUserBySession(session, device, callback){
    pool.query('SELECT users.*, users_sessions.session, users_seeds_client.seed AS `client_seed`, users_seeds_server.seed AS `server_seed`, users_seeds_server.nonce AS `nonce`' +
        ' FROM `users` INNER JOIN `users_sessions` ON users.userid = users_sessions.userid INNER JOIN `users_seeds_client` ON users_seeds_client.userid = users.userid INNER JOIN `users_seeds_server` ON users_seeds_server.userid = users.userid' +
        ' WHERE users_sessions.session = ' + pool.escape(session) + ' AND users_sessions.device = ' + pool.escape(device) + ' AND users_sessions.removed = 0 AND users_sessions.expire > ' + pool.escape(time()) + ' AND users_seeds_client.removed = 0 AND users_seeds_server.removed = 0', function(err1, row1) {

        if(err1) return callback(err1);
        if(row1.length <= 0) return callback(err1, null);

        pool.query('SELECT * FROM `users_security_requests` WHERE `userid` = ' + pool.escape(row1[0].userid) + ' AND `device` = ' + pool.escape(device) + ' AND `removed` = 0 AND `expire` > ' + pool.escape(time()), function(err2, row2) {
            if(err2) return callback(err2);

            pool.query('SELECT * FROM `admin_requests` WHERE `userid` = ' + pool.escape(row1[0].userid) + ' AND `device` = ' + pool.escape(device) + ' AND `removed` = 0 AND `expire` > ' + pool.escape(time()), function(err3, row3) {
                if(err3) return callback(err3);

                callback(null, {
                    ...row1[0],
                    authorized: {
                        account: row2.length > 0,
                        admin: row3.length > 0
                    }
                });
            });
        });

    });
}

module.exports = {
    getUserBySession
};