require('dotenv').config();   // <-- MUST be first

/**
 * Database driver.
 *
 * Why mysql2:
 * - The legacy `mysql` package does not support modern MySQL authentication
 *   plugins (e.g., caching_sha2_password) and fails with ER_NOT_SUPPORTED_AUTH_MODE.
 * - `mysql2` is largely API-compatible while supporting newer auth modes.
 */
var mysql = require('mysql2');
var fs = require('fs');
var path = require('path');
var child_process = require('child_process');

var sqlFolder = path.join(__dirname, '..', 'sql');

var pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    multipleStatements: true
});

function checkDatabaseExists(callback) {
    pool.query('SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ' + pool.escape(process.env.DB_DATABASE), function (err1, row1) {
        if (err1) return callback(err1);

        callback(null, row1.length > 0);
    });
}

function createDatabase(callback) {
    pool.query('CREATE DATABASE `' + process.env.DB_DATABASE + '`', function (err1) {
        if (err1) return callback(err1);

        callback(null);
    });
}

function useDatabase(callback) {
    pool.query('USE `' + process.env.DB_DATABASE + '`', function (err1) {
        if (err1) return callback(err1);

        callback(null);
    });
}

function checkTableExists(tableName, callback) {
    pool.query('SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ' + pool.escape(process.env.DB_DATABASE) + ' AND TABLE_NAME = ' + pool.escape(tableName), function (err1, row1) {
        if (err1) return callback(err1);

        callback(null, row1.length > 0);
    });
}

function createTableAndSeedIfNeeded(tableName, filePath, callback) {
    checkTableExists(tableName, function (err1, exists) {
        if (err1) return callback(err1);

        if (exists) {
            console.log('\x1b[33m[database] table ' + tableName + ' already exists');

            return callback(null);
        }

        var stream = fs.createReadStream(filePath);

		// We intentionally use the MySQL CLI by default because it's more commonly
		// available than the `mariadb` CLI across dev machines/CI environments.
		// Override with DB_CLI_BIN if needed (e.g., `mariadb`).
		var mysqlCliBinary = process.env.DB_CLI_BIN || 'mysql';

		var mysql = child_process.spawn(mysqlCliBinary, [
			'-h', process.env.DB_HOST,
			'-u', process.env.DB_USERNAME,
			'-p' + process.env.DB_PASSWORD,
			process.env.DB_DATABASE
		]);

		stream.pipe(mysql.stdin);

		mysql.on('close', function(code) {
			if(code != 0) return callback(new Error('Process exited with code: ' + code));

			console.log('\x1b[33m[database] table ' + tableName + ' created and initial data inserted');

            callback(null);
		});
    });
}

function processSqlFiles(callback) {
    fs.readdir(sqlFolder, function (err1, files) {
        if (err1) return callback(err1);

        var sqlFiles = files.filter(function (file) {
            return file.endsWith('.sql');
        });

        function runNext(i) {
            if (i >= sqlFiles.length) return callback(null);

            var fileName = sqlFiles[i];
            var tableName = path.basename(fileName, '.sql');
            var filePath = path.join(sqlFolder, fileName);

            createTableAndSeedIfNeeded(tableName, filePath, function (err2) {
                if (err2) return callback(err2);

                runNext(i + 1);
            });
        }

        runNext(0);
    });
}

function initDatabase(callback) {
    checkDatabaseExists(function (err1, exists) {
        if (err1) return callback(err1);

        function proceed() {
            useDatabase(function (err2) {
                if (err2) return callback(err2);

                processSqlFiles(callback);
            });
        }

        if (exists) {
            console.log('\x1b[33m[database] database already exists');

            pool = mysql.createPool({
                database: process.env.DB_DATABASE,
                host: process.env.DB_HOST,
                user: process.env.DB_USERNAME,
                password: process.env.DB_PASSWORD,
                multipleStatements: true
            });

            return proceed();
        }

        console.log('\x1b[33m[database] creating ' + process.env.DB_DATABASE + ' database');

        createDatabase(function (err2) {
            if (err2) return callback(err2);

            pool = mysql.createPool({
                database: process.env.DB_DATABASE,
                host: process.env.DB_HOST,
                user: process.env.DB_USERNAME,
                password: process.env.DB_PASSWORD,
                multipleStatements: true
            });

            proceed();
        });
    });
}

// Validate required database environment variables
if (!process.env.DB_DATABASE || !process.env.DB_HOST || !process.env.DB_USERNAME || !process.env.DB_PASSWORD) {
    console.error('\x1b[31m[FATAL] Missing required database configuration. Please set DB_DATABASE, DB_HOST, DB_USERNAME, and DB_PASSWORD in .env');
    process.exit(1);
}

initDatabase(function(err1){
    if (err1) {
        console.log('\x1b[31m[database] ' + err1);

        process.exit(1);
    }

    console.log('\x1B[32m[database] all database tables synchronized successfully');

    process.exit(0);
});