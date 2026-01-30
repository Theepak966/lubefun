var request = require('request');
var crypto = require('crypto');

var { loggerError } = require('@/lib/logger.js');

var { roundedToFixed, getFormatAmount } = require('@/utils/formatAmount.js');

var config = require('@/config/config.js');

function getLocationByIp(ip, callback){
    // Handle localhost IPs - return default location
    if(ip === '127.0.0.1' || ip === '::1' || ip === 'localhost' || ip.startsWith('127.') || ip.startsWith('::ffff:127.')) {
        return callback(null, { country: 'Local', region: 'Development', city: 'Localhost' });
    }

    // Build API URL with optional token
    var apiUrl = 'https://ipinfo.io/' + ip + '/json';
    if(config.app.ipinfo.api_token) {
        apiUrl += '?token=' + config.app.ipinfo.api_token;
    }

    request(apiUrl, function(err1, response1) {
		if(err1) {
            loggerError(err1);
            // Return default location instead of error for development
            return callback(null, { country: 'Unknown', region: 'Unknown', city: 'Unknown' });
        }

        if(!response1 || response1.statusCode != 200) {
            // Return default location instead of error for development
            return callback(null, { country: 'Unknown', region: 'Unknown', city: 'Unknown' });
        }

        try {
            var res = JSON.parse(response1.body);

            var country = res.country || 'Unknown';
            var region = res.region || 'Unknown';
            var city = res.city || 'Unknown';

            callback(null, { country, region, city });
        } catch(parseErr) {
            loggerError(parseErr);
            // Return default location if JSON parsing fails
            callback(null, { country: 'Unknown', region: 'Unknown', city: 'Unknown' });
        }
	});
}

function getUserDevice(agent) {
    var browser = { name: '', version: '' };
    var platform = 'Unknown';
    var os = { name: '', version: '' };
    var device = 'Unknown';

    let mobile = /Mobile/i.test(agent);

    // Browser detection
    if (/MSIE/i.test(agent) && !/Opera/i.test(agent)) {
        browser.name = 'Internet Explorer';

        var match = agent.match(/MSIE (\d+(\.\d+)?)/i);
        if(match) browser.version = match[1];
    } else if (/Firefox/i.test(agent)) {
        browser.name = 'Mozilla Firefox';

        var match = agent.match(/Firefox\/(\d+(\.\d+)?)/i);
        if(match) browser.version = match[1];
    } else if (/Chrome/i.test(agent)) {
        if(agent.includes('Brave')) browser.name = 'Brave Browser';
        else if(agent.includes('HuaweiBrowser')) browser.name = 'Huawei Browser';
        else if(agent.includes('Edg')) browser.name = 'Microsoft Edge';
        else if(agent.includes('YaBrowser')) browser.name = 'Yandex Browser';
        else if(agent.includes('UCBrowser')) browser.name = 'UC Browser';
        else if(agent.includes('SamsungBrowser')) browser.name = 'Samsung Browser';
        else if(agent.includes('OPR') || agent.includes('Opera')) browser.name = 'Opera';
        else browser.name = 'Google Chrome';

        var match = agent.match(/Chrome\/(\d+(\.\d+)?)/i);
        if(match) browser.version = match[1];
    } else if (/Safari/i.test(agent)) {
        browser.name = 'Apple Safari';

        var match = agent.match(/Version\/(\d+(\.\d+)?)/i);
        if(match) browser.version = match[1];
    } else if (/Opera/i.test(agent)) {
        browser.name = 'Opera';

        var match = agent.match(/Opera\/(\d+(\.\d+)?)/i);
        if(match) browser.version = match[1];
    }

    // Platform & OS detection
    if (/Windows/i.test(agent)) {
        platform = 'Windows';
        os.name = 'Windows';

        var match = agent.match(/NT ([\d\.]+)(;\s+([^\)]+))?/i);
        var versions = { '10.0': '10', '6.3': '8.1', '6.2': '8', '6.1': '7', '6.0': 'Vista', '5.1': 'XP', '5.0': '2000' };
        if(match && versions[match[1]]) os.version = versions[match[1]];
        if(match && match[3]) device = match[3].split(';')[0].trim();
    } else if (/iPhone/i.test(agent)) {
        platform = 'iOS';
        os.name = 'iPhone';

        var match = agent.match(/iPhone OS ([\d\.]+)(;\s+([^\)]+))?/i);
        if(match) os.version = match[1];
        if(match && match[3]) device = match[3].split(';')[0].trim();
    } else if (/iPad/i.test(agent)) {
        platform = 'iOS';
        os.name = 'iPad';

        var match = agent.match(/CPU OS ([\d\.]+)(;\s+([^\)]+))?/i);
        if(match) os.version = match[1];
        if(match && match[3]) device = match[3].split(';')[0].trim();
    } else if (/Macintosh/i.test(agent)) {
        platform = 'Mac OS X';
        os.name = 'Macintosh';

        var match = agent.match(/Mac OS X ([\d\.]+)(;\s+([^\)]+))?/i);
        if(match) os.version = match[1];
        if(match && match[3]) device = match[3].split(';')[0].trim();
    } else if (/Android/i.test(agent)) {
        platform = 'Android';
        os.name = /Mobile/i.test(agent) ? 'Android Phone' : 'Android Tablet';

        var match = agent.match(/Android ([\d\.]+)(;\s+([^\)]+))?/i);
        if(match) os.version = match[1];
        if(match && match[3]) device = match[3].split(';')[0].trim();
    } else if (/Linux/i.test(agent)) {
        platform = 'Linux';

        if (/Ubuntu/i.test(agent)) {
            os.name = 'Ubuntu';

            var match = agent.match(/Ubuntu\/([\d\.]+)(;\s+([^\)]+))?/i);
            if(match) os.version = match[1];
            if(match && match[3]) device = match[3].split(';')[0].trim();
        }
    }

    return { browser, platform, os, device, mobile };
}

function haveRankPermission(permission, rank){
    if(config.app.permissions[permission] === undefined) return false;

    return config.app.permissions[permission].includes(config.app.ranks[rank]);
}

function verifyRecaptcha(recaptcha, callback){
	request('https://www.google.com/recaptcha/api/siteverify?secret=' + config.app.recaptcha.private_key + '&response=' + recaptcha, function(err1, response1) {
		if(err1) {
			loggerError(err1);

			return callback(false);
		}

        if(!response1 || response1.statusCode != 200) return callback(false);

		var body = JSON.parse(response1.body);

		if(body.success !== undefined) return callback(body.success);

		callback(false);
	});
}

function calculateLevel(xp){
	var start = 0;
	var next = config.app.level.start;

	var level = 0;

	for(var i = 1; next <= xp && level < 100; i++){
		start = next;
		next += Math.floor(next * config.app.level.next * (1.00 - 0.0095 * level));

		level++;
	}

	return {
		level: level,
		start: 0,
		next: next - start,
		have: ((xp > next) ? next : xp) - start
	};
}

function parseItemName(name){
	var infos = {
		title: null,
		subtitle: null,
		exterior: null
	};

	var match = /^\s*(.*?)\s*(?:\|\s*(.*?)\s*(?:\((Battle-Scarred|Well-Worn|Field-Tested|Minimal Wear|Factory New)\))?)?$/.exec(name);

	if(match && match[2]) {
		infos.title = match[1] || null;
		infos.subtitle = match[2] || null;
		infos.exterior = match[3] || null;
	} else infos.title = name.trim();

	return infos;
}

function getColorByQuality(quality){
    var qualities = {
		'consumer_grade': '#b0c3d9',
		'mil_spec_grade': '#4b69ff',
		'industrial_grade': '#5e98d9',
		'restricted': '#8847ff',
		'classified': '#d32ce6',
		'covert': '#eb4b4b',
		'base_grade': '#b0c3d9',
		'extraordinary': '#eb4b4b',
		'high_grade': '#4b69ff',
		'remarkable': '#8847ff',
		'exotic': '#d32ce6',
		'contraband': '#e4ae39',
		'distinguished': '#4b69ff',
		'exceptional': '#8847ff',
		'superior': '#d32ce6',
		'master': '#eb4b4b'
	};

    if(qualities[quality] === undefined) return null;

	return qualities[quality];
}

function getInfosByItemName(name){
	var infos = {
		brand: null,
		name: null,
		exterior: null
	};

	var match = /^\s*(.*?)\s*(?:\|\s*(.*?)\s*(?:\(\s*(.*?)\s*\))?)?$/.exec(name);

	if(match && match[2]) {
		infos.brand = match[1] || null;
		infos.name = match[2] || null;
		infos.exterior = match[3] || null;
	} else infos.brand = name.trim();

	return infos;
}

function escapeHTML(string) {
    string = string.replace(/&/g, '&amp;');
    string = string.replace(/</g, '&lt;');
    string = string.replace(/>/g, '&gt;');
    string = string.replace(/"/g, '&quot;');
    string = string.replace(/'/g, '&#039;');

    return string;
}

function isJsonString(string) {
    try {
        JSON.parse(string);
    } catch (e) {
        return false;
    }

    return true;
}

function setObjectProperty(object, path, value){
	var parts = path.split('..');

  	for (var i = 0; i < parts.length - 1; ++i) {
      	var key = parts[i];
    	object = object[key];
    }

    object[parts[parts.length - 1]] = value;
};

function lowercaseKeysObject(object) {
	return Object.keys(object).reduce((accumulator, key) => {
		accumulator[key.toLowerCase()] = object[key];

		return accumulator;
	}, {});
}

function sortObject(object) {
    return Object.keys(object).sort().reduce((result, key) => {
        result[key] = (object[key] && typeof object[key] === 'object') ? sortObject(object[key]) : object[key];
        return result;
    }, {});
}

function getAmountCommission(amount, commission){
	return roundedToFixed(amount * commission / 100, 5);
}

function getXpByAmount(amount){
	var xp = Math.floor(getFormatAmount(amount) * 100);

	if(new Date().getDay() == 0 || new Date().getDay() == 6) xp *= 2;

	return xp;
}

function getAffiliateCommission(deposits, type){
	var tier = 0;
	for(tier = 0; tier < config.app.affiliates.requirements.length; tier++) {
		if(deposits < config.app.affiliates.requirements[tier]) break;
	}

	return tier * config.app.affiliates.commissions[type];
}

function generateSessionToken(){
    return crypto.randomBytes(32).toString('hex');
}

function generateHexCode(length) {
    var bytes = Math.ceil(length / 2);

    return crypto.randomBytes(bytes).toString('hex').slice(0, length);
}

function generateSecurityCode(length) {
    var token = '';

    while (token.length < length) {
        var byte = crypto.randomBytes(1)[0];

        if (byte < 250) token += String(byte % 10);
    }

    return token;
}

function getRandomInt(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function countDecimals(value) {
    if (Math.floor(value) !== value) return value.toString().split('.')[1].length || 0;

	return 0;
}

function capitalizeText(text){
	return text.charAt(0).toUpperCase() + text.slice(1);
}

function getSlug(text){
    if(text == null) return null;

    return text.toLowerCase().normalize('NFD').replace(/[^\w\s\-]/gi, '').trim().replace(/[\s\-_]+/g, '_')
}

module.exports = {
	getLocationByIp, getUserDevice, haveRankPermission, verifyRecaptcha, calculateLevel, parseItemName, getColorByQuality,
	getInfosByItemName, escapeHTML, isJsonString, setObjectProperty, lowercaseKeysObject, sortObject, getAmountCommission,
	getXpByAmount, getAffiliateCommission, generateSessionToken, generateHexCode, generateSecurityCode, getRandomInt, countDecimals, capitalizeText, getSlug
};