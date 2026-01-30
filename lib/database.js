/**
 * Database driver.
 *
 * Why mysql2:
 * - The legacy `mysql` package does not support modern MySQL authentication
 *   plugins (e.g., caching_sha2_password) and fails with ER_NOT_SUPPORTED_AUTH_MODE.
 * - `mysql2` is largely API-compatible while supporting newer auth modes.
 */
var mysql = require('mysql2');

var { loggerError } = require('@/lib/logger.js');

var config = require('@/config/config.js');

// Validate required database configuration
if (!config.app.database.database || !config.app.database.host || !config.app.database.user || !config.app.database.password) {
    console.error('[FATAL] Missing required database configuration. Please set DB_DATABASE, DB_HOST, DB_USERNAME, and DB_PASSWORD in .env');
    process.exit(1);
}

var pool = mysql.createPool({
	database: config.app.database.database,
	host: config.app.database.host,
	port: config.app.database.port || 3306,
	user: config.app.database.user,
	password: config.app.database.password
});

function query(sql, callback){
    pool.query(sql, function(err1, row1) {
        if(err1) loggerError(err1);

        callback(err1, row1);
    });
}

function escape(value){
    return pool.escape(value);
}

class Connection {
    constructor(callback) {
        this.connection = null;
        this.isTransactionStarted = false;

        pool.getConnection((err1, connection) => {
            if(err1) {
                loggerError(err1);

                if (callback) return callback(err1);
            }

            this.connection = connection;

            this.connection.beginTransaction((err2) => {
                if(err2) {
                    loggerError(err2);

                    this.connection.release();

                    if (callback) return callback(err2);
                }

                this.isTransactionStarted = true;

                if (callback) callback(null, this);
            });
        });
    }

    query(sql, callback) {
        if (!this.isTransactionStarted) if (callback) return callback(new Error('Transaction not started'));

        this.connection.query(sql, (err1, row1) => {
            if(err1) {
                loggerError(err1);

                return this.connection.rollback(() => {
                    this.connection.release();
                    this.isTransactionStarted = false;

                    if (callback) callback(err1);
                });
            }

            if (callback) callback(null, row1);
        });
    }

    commit(callback) {
        if (!this.isTransactionStarted) if (callback) return callback(new Error('Transaction not started'));

        this.connection.commit((err1) => {
            if(err1) {
                loggerError(err1);

                return this.connection.rollback(() => {
                    this.connection.release();
                    this.isTransactionStarted = false;

                    if (callback) callback(err1);
                });
            }

            this.connection.release();
            this.isTransactionStarted = false;

            if (callback) callback(null);
        });
    }

    rollback(callback) {
        if (!this.isTransactionStarted) if (callback) return callback(new Error('Transaction not started'));

        this.connection.rollback(() => {
            this.connection.release();
            this.isTransactionStarted = false;

            if (callback) callback(null);
        });
    }
}

module.exports.Connection = Connection;

module.exports.pool = {
        query,
        escape
};