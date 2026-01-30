var request = require('request');
var crypto = require('crypto');

var { pool } = require('@/lib/database.js');
var { emitSocketToUser } = require('@/lib/socket.js');
var { loggerError } = require('@/lib/logger.js');

var { time } = require('@/utils/formatDate.js');

var { verifyRecaptcha, isJsonString, generateHexCode } = require('@/utils/utils.js');

var config = require('@/config/config.js');

var generateQueue = [];
var haveGenerateQueue = false;

var getQueue = [];
var haveGetQueue = false;

function generateEosSeed(initialize, callback){
	generateQueue.push({ initialize, callback });

	if(!haveGenerateQueue) queueGenerateEosSeed();
}

/* ----- INTERNAL USAGE ----- */
function queueGenerateEosSeed(){
	haveGenerateQueue = true;

	var link = 'https://eos.eosusa.io/v1/chain/get_info'

	request(link, function(err1, response1, body1) {
		if(err1) {
			loggerError(err1);

			return setTimeout(function(){
				queueGenerateEosSeed();
			}, 1000);
		}

        if(!response1 || response1.statusCode != 200) {
			return setTimeout(function(){
				queueGenerateEosSeed();
			}, 1000);
		}
		if(!isJsonString(body1)) {
			return setTimeout(function(){
				queueGenerateEosSeed();
			}, 1000);
		}

		var data = JSON.parse(body1);

		var last_block = data.head_block_num;
		var target_block = last_block + config.games.eos_future;

		generateQueue[0].initialize({ block: target_block });

		var callback = generateQueue[0].callback;
		getEosSeed(target_block, function(target_hash){
			callback({
				block: target_block,
				hash: target_hash
			});
		});

		generateQueue.shift();

		setTimeout(function(){
			if(generateQueue.length > 0) return queueGenerateEosSeed();

			haveGenerateQueue = false;
		}, 1000);
	});
}

/* ----- INTERNAL USAGE ----- */
function getEosSeed(block, callback){
	getQueue.push({ block, callback });

	if(!haveGetQueue) queueGetEosSeed();
}

/* ----- INTERNAL USAGE ----- */
function queueGetEosSeed(){
	haveGetQueue = true;

	var options = {
		uri: 'https://eos.eosusa.io/v1/chain/get_block',
		method: 'POST',
		body: JSON.stringify({ block_num_or_id: getQueue[0].block })
	}

	request(options, function(err1, response1, body1) {
		if(err1) {
			loggerError(err1);

			return setTimeout(function(){
				queueGetEosSeed();
			}, 1000);
		}

        if(!response1 || response1.statusCode != 200) {
			return setTimeout(function(){
				queueGetEosSeed();
			}, 1000);
		}

		if(!isJsonString(body1)) {
			return setTimeout(function(){
				queueGetEosSeed();
			}, 1000);
		}

		var data = JSON.parse(body1);

		var hash = data.id;

		getQueue[0].callback(hash);

		getQueue.shift();

		setTimeout(function(){
			if(getQueue.length > 0) return queueGetEosSeed();

			haveGetQueue = false;
		}, 1000);
	});
}

function generateServerSeed(){
	var server_seed = generateHexCode(64);

	return server_seed;
}

function generatePublicSeed(){
	var public_seed = generateHexCode(64);

	return public_seed;
}

function getCombinedSeed(server_seed, client_seed, nonce) {
	return [server_seed, client_seed, nonce].join('-');
}

function generateSaltHash(seed) {
	return crypto.createHmac('sha256', seed).digest('hex');
}

function getShuffle(salt, max) {
	//Set shuffle inexes
	var array = [];
	for(var i = 0; i < max; i++) array.push(i);

	//Fisher-yates shuffle implementation
	for(var i = array.length - 1, k = 0; i > 0; i--, k++) {
		var salt_position = generateSaltHash(salt + '-' + k);
		var roll = getRoll(salt_position, Math.pow(10, 8)) / Math.pow(10, 8);

		var j = Math.floor(roll * (i + 1));

		[array[i], array[j]] = [array[j], array[i]];
	}

	return array;
}

function getRoll(salt, max) {
	return Math.abs(parseInt(salt.substr(0, 12), 16)) % max;
}

function getRollTower(salt, amount) {
	var array = [];

	//Get tower roll by stage
	for(var i = 0; i < 9; i++){
		var salt_position = generateSaltHash(salt + '-' + i);

		var roll = getRoll(salt_position, amount);

		array.push(roll);
	}

	return array;
}

function getRollCrash(salt){
	var INSTANT_CRASH_PERCENTAGE = config.games.games.crash.instant_chance;

	// Use the most significant 52-bit from the salt to calculate the crash point
    var h = parseInt(salt.slice(0, 52 / 4), 16);
    var e = Math.pow(2, 52);
    var result = (100 * e - h) / (e - h);

    // INSTANT_CRASH_PERCENTAGE of 5.00 will result in modifier of 0.95 = 5.00% house edge with a lowest crashpoint of 1.00x
    var houseEdgeModifier = 1 - INSTANT_CRASH_PERCENTAGE / 100;
    var endResult = Math.max(100, result * houseEdgeModifier);

    return Math.floor(endResult);
}

function getUserSeeds(userid, callback){
	pool.query('SELECT users_seeds_client.seed AS `client_seed`, users_seeds_server.seed AS `server_seed`, users_seeds_server.nonce AS `nonce`, users_seeds_client.id AS `client_seedid`, users_seeds_server.id AS `server_seedid` FROM `users_seeds_client` INNER JOIN `users_seeds_server` ON users_seeds_client.userid = users_seeds_server.userid WHERE users_seeds_client.userid = ' + pool.escape(userid) + ' AND users_seeds_client.removed = 0 AND users_seeds_server.removed = 0 LIMIT 1', function(err1, row1) {
		if(err1) return callback(new Error('An error occurred while getting user seeds (1)'));

		if(row1.length <= 0) return callback(new Error('An error occurred while getting user seeds (2)'));

		var client_seedid = row1[0].client_seedid;
		var server_seedid = row1[0].server_seedid;

		var client_seed = row1[0].client_seed;
		var server_seed = row1[0].server_seed;

		var nonce = row1[0].nonce;

		callback(null, { client_seedid, server_seedid, client_seed, server_seed, nonce });
	});
}

/* ----- CLIENT USAGE ----- */
function regenerateServerSeed(user, socket, recaptcha, cooldown){
	cooldown(true, true);

	verifyRecaptcha(recaptcha, function(verified){
		if(!verified){
			emitSocketToUser(socket, 'message', 'error', {
				message: 'Invalid recaptcha!'
			});

			return cooldown(false, true);
		}

		pool.query('UPDATE `users_seeds_server` SET `removed` = 1 WHERE `userid` = ' + pool.escape(user.userid) + ' AND `removed` = 0', function(err1, row1){
			if(err1) {
				emitSocketToUser(socket, 'message', 'error', {
                    message: 'An error occurred while generating server seed (1)'
                });

				return cooldown(false, true);
			}

			var server_seed = generateHexCode(64);

			pool.query('INSERT INTO `users_seeds_server` SET `userid` = ' + pool.escape(user.userid) + ', `seed` = ' + pool.escape(server_seed) + ', `time` = ' + pool.escape(time()), function(err2, row2){
				if(err2) {
					emitSocketToUser(socket, 'message', 'error', {
                        message: 'An error occurred while generating server seed (2)'
                    });

					return cooldown(false, true);
				}

				emitSocketToUser(socket, 'site', 'refresh');

				emitSocketToUser(socket, 'message', 'success', {
					message: 'Server seed successfully regenerated!'
				});

				cooldown(false, false);
			});
		});
	});
}

/* ----- CLIENT USAGE ----- */
function changeClientSeed(user, socket, seed, recaptcha, cooldown){
	cooldown(true, true);

	verifyRecaptcha(recaptcha, function(verified){
		if(!verified){
			emitSocketToUser(socket, 'message', 'error', {
				message: 'Invalid recaptcha!'
			});

			return cooldown(false, true);
		}

		pool.query('UPDATE `users_seeds_client` SET `removed` = 1 WHERE `userid` = ' + pool.escape(user.userid) + ' AND `removed` = 0', function(err1, row1){
			if(err1) {
				emitSocketToUser(socket, 'message', 'error', {
                    message: 'An error occurred while generating client seed (1)'
                });

				return cooldown(false, true);
			}

			pool.query('INSERT INTO `users_seeds_client` SET `userid` = ' + pool.escape(user.userid) + ', `seed` = ' + pool.escape(seed) + ', `time` = ' + pool.escape(time()), function(err2, row2){
				if(err2) {
					emitSocketToUser(socket, 'message', 'error', {
                        message: 'An error occurred while generating client seed (2)'
                    });

					return cooldown(false, true);
				}

				emitSocketToUser(socket, 'message', 'success', {
					message: 'Client seed successfully changed!'
				});

				cooldown(false, false);
			});
		});
	});
}

module.exports = {
	generateEosSeed, generateServerSeed, generatePublicSeed, getCombinedSeed, generateSaltHash,
    getShuffle,
    getRoll,
    getRollTower,
    getRollCrash,
    getUserSeeds,
	regenerateServerSeed, changeClientSeed
};