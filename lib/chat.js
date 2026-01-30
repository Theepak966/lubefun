var { emitSocketToUser, emitSocketToRoom } = require('@/lib/socket.js');
var { time } = require('@/utils/formatDate.js');

var config = require('@/config/config.js');

var messages = {};
var ignoreList = {};

var mode = 1;

var ranks = {
	'player': [ config.app.ranks.member ],
	'admin': [ config.app.ranks.admin ],
	'moderator': [ config.app.ranks.moderator ],
	'helper': [ config.app.ranks.helper ],
	'veteran': [ config.app.ranks.veteran ],
	'pro': [ config.app.ranks.pro ],
	'youtuber': [ config.app.ranks.youtuber ],
	'streamer': [ config.app.ranks.streamer ],
	'developer': [ config.app.ranks.developer ],
	'owner': [ config.app.ranks.owner ],
	'all': [
        config.app.ranks.member,
        config.app.ranks.admin,
        config.app.ranks.moderator,
        config.app.ranks.helper,
        config.app.ranks.veteran,
        config.app.ranks.pro,
        config.app.ranks.youtuber,
        config.app.ranks.streamer,
        config.app.ranks.developer,
        config.app.ranks.owner
    ]
}

var commands = {
	//HELP
	'help': {
		enabled: true,
		arguments: [],
		allowed: [ 'all' ],
		help: [
			'Displays this menu'
		]
	},

	//TIP
	'tip': {
		enabled: true,
		arguments: [{
			type: 'userid',
			name: [ 'userid' ],
			description: 'specifies the userid to send',
			mandatory: true,
			plain: false
		}],
		allowed: [ 'all' ],
		help: [
			'Opens the gift window for tipping'
		]
	},

	//IGNORE
	'ignore': {
		enabled: true,
		arguments: [{
			type: 'userid',
			name: [ 'userid' ],
			description: 'specifies the userid to ignore',
			mandatory: true,
			plain: false
		}],
		allowed: [ 'all' ],
		help: [
			'Ignores the player who is annoying or who is bothering'
		]
	},
	'unignore': {
		enabled: true,
		arguments: [{
			type: 'userid',
			name: [ 'userid' ],
			description: 'specifies the userid to unignore',
			mandatory: true,
			plain: false
		}],
		allowed: [ 'all' ],
		help: [
			'Unignores the ignored player'
		]
	},
	'ignorelist': {
		enabled: true,
		arguments: [],
		allowed: [ 'all' ],
		help: [
			'Opens the list with all players ignored'
		]
	},

	//MESSAGE
	'deletemessage': {
		enabled: true,
		arguments: [{
			type: 'integer',
			name: [ 'messageid' ],
			description: 'specifies the message id to delete',
			mandatory: true,
			plain: false
		}],
		allowed: [ 'owner', 'admin', 'moderator' ],
		help: [
			'Deletes a chat message'
		]
	},
	'pinmessage': {
		enabled: true,
		arguments: [{
			type: 'integer',
			name: [ 'messageid' ],
			description: 'specifies the message id to pin',
			mandatory: true,
			plain: false
		}],
		allowed: [ 'owner', 'admin', 'moderator' ],
		help: [
			'Pins a chat message'
		]
	},

	//MUTE
	'mute': {
		enabled: true,
		arguments: [{
			type: 'userid',
			name: [ 'userid' ],
			description: 'specifies the userid to mute',
			mandatory: true,
			plain: false
		}],
		allowed: [ 'owner', 'admin', 'moderator' ],
		help: [
			'Opens the mute window for mutinging a player'
		]
	},
	'unmute': {
		enabled: true,
		arguments: [{
			type: 'userid',
			name: [ 'userid' ],
			description: 'specifies the userid to mute',
			mandatory: true,
			plain: false
		}],
		allowed: [ 'owner', 'admin', 'moderator' ],
		help: [
			'Unmutes the muted player'
		]
	},

	//CHAT
	'clearchat': {
		enabled: true,
		arguments: [],
		allowed: [ 'owner', 'admin', 'moderator' ],
		help: [
			'Clears the messages of the entire chat'
		]
	},
	'clearchannel': {
		enabled: true,
		arguments: [],
		allowed: [ 'owner', 'admin', 'moderator' ],
		help: [
			'Clears the messages of the current chat channel'
		]
	},
	'chatmode': {
		enabled: true,
		arguments: [{
			type: 'word',
			name: [ 'normal', 'fast', 'pause' ],
			description: 'specifies the chat mode to set',
			mandatory: true,
			plain: true
		}],
		allowed: [ 'owner', 'admin', 'moderator' ],
		help: [
			'Changes the chat mode'
		]
	},
	'chatpoll': {
		enabled: true,
		arguments: [],
		allowed: [ 'owner', 'admin', 'moderator' ],
		help: [
			'Opens the window to create a chat poll'
		]
	},

	//RAIN
	'endrain': {
		enabled: true,
		arguments: [],
		allowed: [ 'owner', 'admin' ],
		help: [
			'Ends the current rain event'
		]
	},

	//ONLINE
	'online': {
		enabled: true,
		arguments: [],
		allowed: [ 'owner', 'admin' ],
		help: [
			'Opens the window with the online players'
		]
	},

	//POP
	'pop': {
		enabled: true,
		arguments: [],
		allowed: [ 'all' ],
		help: [
			'Shows the number of online players'
		]
	}
}

function writeSystemMessage(message, channel, keep, socket){
	var new_message = {
		type: 'system',
		message: message,
		time: time()
	}

	if(socket){
		return emitSocketToUser(socket, 'chat', 'message', {
			message: new_message
		});
	}

	var channels = config.app.chat.channels.reduce((acc, cur) => ({ ...acc, [cur]: [ cur ] }), { all: config.app.chat.channels });

	channels[channel].forEach(function(item){
		emitSocketToRoom('chat_channel_' + item, 'chat', 'message', {
			message: new_message
		});

		if(keep){
			if(messages[item] === undefined) messages[item] = [];

			messages[item].push(new_message);

			if(messages[item].length > config.app.chat.max_messages) messages[item].shift();
		}
	});
}

module.exports = {
    messages, ignoreList, mode, ranks, commands,
    writeSystemMessage
};