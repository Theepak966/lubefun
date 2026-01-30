var { pool } = require('@/lib/database.js');
var { emitSocketToUser, emitSocketToAll, emitSocketToRoom } = require('@/lib/socket.js');
var { loggerDebug, loggerInfo } = require('@/lib/logger.js');
var { usersOnline } = require('@/lib/globals.js');

var chatService = require('@/lib/chat.js');
var userService = require('@/services/userService.js');
var rainService = require('@/services/rainService.js');

var { makeDate, time } = require('@/utils/formatDate.js');
var { haveRankPermission, calculateLevel, escapeHTML } = require('@/utils/utils.js');

var config = require('@/config/config.js');

var usersMessages = {};
var usersChannels = {};

var expressions = {
	'decimal': '^([0-9.]+)$',
	'integer': '^([0-9]+)$',
	'userid': '^([a-f0-9-]{36})$',
	'string': '^([a-zA-Z0-9 ]+)$',
	'word': '^([a-zA-Z0-9]+)$'
};

function initializeChat(){
	loadMessages();
	loadIgnoreList();

	if(config.app.chat.support.active){
		setInterval(function(){
			writeSystemMessage(config.app.chat.support.message, 'all', true, null);
		}, config.app.chat.support.cooldown * 1000);
	}
}

/* ----- INTERNAL USAGE ----- */
function loadMessages(){
    loggerDebug('[CHAT] Loading Messages History');

    Object.keys(chatService.messages).forEach(key => delete chatService.messages[key]);

	pool.query('SELECT message.*, reply.id AS reply_id, reply.message AS reply_message, reply.userid AS reply_userid, reply.name AS reply_name, reply.avatar AS reply_avatar, reply.xp AS reply_xp FROM `chat_messages` AS `message` LEFT JOIN `chat_messages` AS `reply` ON message.reply = reply.id WHERE (SELECT COUNT(*) FROM `chat_messages` AS `sub` WHERE sub.deleted = 0 AND sub.channel = message.channel AND sub.id >= message.id ORDER BY sub.id DESC) <= ' + config.app.chat.max_messages + ' AND message.deleted = 0 AND COALESCE(reply.deleted, 0) = 0 ORDER BY `id` DESC', function(err1, row1){
		if(err1) {
            loggerInfo('[CHAT] Error In Loading Messages History');

            return setTimeout(function(){
                loadMessages();
            }, 1000);
        }

		if(row1.length <= 0) return;

		row1.reverse();

		loadMessage(0, row1);
		function loadMessage(index, listmessages){
			if(index >= listmessages.length) return;

			getMentions(listmessages[index].message, function(err2, mentions2){
                if(err2) {
                    loggerInfo('[CHAT] Error In Loading Messages History');

                    return setTimeout(function(){
                        loadMessages();
                    }, 1000);
                }

				getMentions(listmessages[index].reply !== null ? listmessages[index].reply_message : '', function(err3, mentions3){
                    if(err3) {
                        loggerInfo('[CHAT] Error In Loading Messages History');

                        return setTimeout(function(){
                            loadMessages();
                        }, 1000);
                    }

                    var new_message = {
						type: 'player',
						id: listmessages[index].id,
						user: {
							userid: listmessages[index].userid,
							name: listmessages[index].name,
							avatar: listmessages[index].avatar,
							level: calculateLevel(listmessages[index].xp).level
						},
						rank: listmessages[index].rank,
						private: listmessages[index]['private'],
						message: listmessages[index].message,
						channel: listmessages[index].channel,
						reply: listmessages[index].reply !== null ? {
							id: listmessages[index].reply_id,
							message: listmessages[index].reply_message,
							mentions: mentions3,
							user: {
								userid: listmessages[index].reply_userid,
								name: listmessages[index].reply_name,
								avatar: listmessages[index].reply_avatar,
								level: calculateLevel(listmessages[index].reply_xp).level
							}
						} : null,
						mentions: mentions2,
						time: listmessages[index].time
					}

					if(chatService.messages[listmessages[index].channel] === undefined) chatService.messages[listmessages[index].channel] = [];

					chatService.messages[listmessages[index].channel].push(new_message);

					loadMessage(index + 1, listmessages);
				});
			});
		}
	});
}

/* ----- INTERNAL USAGE ----- */
function loadIgnoreList(){
    loggerDebug('[CHAT] Loading Ignore List');

	pool.query('SELECT chat_ignore.userid, users.userid AS `ignoreid`, users.name, users.avatar, users.xp, chat_ignore.time FROM `chat_ignore` INNER JOIN `users` ON chat_ignore.ignoreid = users.userid WHERE chat_ignore.removed = 0', function(err1, row1){
		if(err1) {
            loggerInfo('[CHAT] Error In Loading Ignore List');

            return setTimeout(function(){
                loadIgnoreList();
            }, 1000);
        }

		if(row1.length <= 0) return;

		if(chatService.ignoreList[row1[0].userid] === undefined) chatService.ignoreList[row1[0].userid] = {};

		chatService.ignoreList[row1[0].userid][row1[0].ignoreid] = {
			user: {
				userid: row1[0].ignoreid,
				name: row1[0].name,
				avatar: row1[0].avatar,
				level: calculateLevel(row1[0].xp).level
			},
			time: makeDate(new Date(row1[0].time * 1000))
		};
	});
}

/* ----- CLIENT USAGE ----- */
function loadChannel(user, socket, channel, cooldown){
	cooldown(true, true);

	if(!config.app.chat.channels.includes(channel)){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid chat channel!'
		});

		return cooldown(false, true);
	}

	var paths = null;

	if(usersChannels[socket.id] !== undefined) {
		//USER ONLINE OLD CHANNEL
		if(usersOnline[usersChannels[socket.id]] !== undefined){
			if(usersOnline[usersChannels[socket.id]][user.userid] !== undefined) {
				paths = usersOnline[usersChannels[socket.id]][user.userid].paths;

				usersOnline[usersChannels[socket.id]][user.userid].count--;

				if(usersOnline[usersChannels[socket.id]][user.userid].count <= 0) {
					delete usersOnline[usersChannels[socket.id]][user.userid];
					if(Object.keys(usersOnline[usersChannels[socket.id]]).length <= 0) delete Object.keys(usersOnline[usersChannels[socket.id]]).length;
				}
			}
		}

		socket.leave('chat_channel_' + usersChannels[socket.id]);
	}

	socket.join('chat_channel_' + channel);
	usersChannels[socket.id] = channel;

	//USER ONLINE NEW CHANNEL
	if(usersOnline[channel] === undefined) usersOnline[channel] = {};
	if(usersOnline[channel][user.userid] === undefined) usersOnline[channel][user.userid] = {
		count: 0,
		guest: user.guest,
		paths: paths,
		user: {
			userid: user.userid,
			name: user.name,
			avatar: user.avatar,
			level: calculateLevel(user.xp).level,
			rank: user.rank
		}
	};

	usersOnline[channel][user.userid].count++;

	emitSocketToUser(socket, 'chat', 'channel', {
		channel: channel,
		messages: [ ...(chatService.messages[channel] || []), ...[{
			type: 'system',
			message: config.app.chat.greeting.message,
			time: time()
		}] ]
	});

	emitSocketToAll('site', 'online', {
		online: config.app.chat.channels.reduce((acc, cur) => ({ ...acc, [cur]: Object.keys(usersOnline[cur] || {}).length }), {})
	});

	cooldown(false, false);
}

/* ----- CLIENT USAGE ----- */
function loadCommands(user, socket, message, cooldown){
	cooldown(true, true);

	var message_index = -1;
	var channel = null;

	for(var item of Object.keys(chatService.messages)){
		message_index = chatService.messages[item].findIndex(item => item.id == message);
		channel = item;

		if(message_index >= 0) break;
	}

	if(message_index < 0) {
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Unknown message!'
		});

		return cooldown(false, true);
	}

	var userid = chatService.messages[channel][message_index].user.userid;

	pool.query('SELECT * FROM `users_restrictions` WHERE `removed` = 0 AND `restriction` = ' + pool.escape('mute') + ' AND (`expire` = -1 OR `expire` > ' + pool.escape(time()) + ') AND `userid` = ' + pool.escape(userid), function(err1, row1) {
		if(err1){
			emitSocketToUser(socket, 'message', 'error', {
                message: 'An error occurred while loading commands (1)'
            });

			return cooldown(false, true);
		}

		var muted = false;
		if(row1.length > 0) muted = true;

		pool.query('SELECT * FROM `chat_ignore` WHERE `userid` = ' + pool.escape(user.userid) + ' AND `ignoreid` = ' + pool.escape(userid) + ' AND `removed` = 0', function(err2, row2){
			if(err2){
				emitSocketToUser(socket, 'message', 'error', {
                    message: 'An error occurred while loading commands (2)'
                });

				return cooldown(false, true);
			}

			var ignored = false;
			if(row2.length > 0) ignored = true;

			var listcommands = Object.keys(chatService.commands).filter(a => chatService.commands[a].enabled && chatService.commands[a].allowed.map(b => chatService.ranks[b]).reduce((acc, cur) => ([ ...acc, ...cur ]), []).includes(user.rank));

			emitSocketToUser(socket, 'chat', 'commands', {
				message: chatService.messages[channel][message_index],
				muted: muted,
				ignored: ignored,
				commands: listcommands
			});

			cooldown(false, false);
		});
	});
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
			if(chatService.messages[item] === undefined) chatService.messages[item] = [];

			chatService.messages[item].push(new_message);

			if(chatService.messages[item].length > config.app.chat.max_messages) chatService.messages[item].shift();
		}
	});
}

/* ----- CLIENT USAGE ----- */
function checkMessage(user, socket, message, channel, reply, cooldown) {
	cooldown(true, true);

	if(message.trim().length <= 0){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Message is empty!'
		});

		return cooldown(false, true);
	}

	if(!checkCommand(message)) return writeMessage(user, socket, message, channel, reply, cooldown);

	useCommand(user, socket, message, channel, function(err1){
		if(err1){
			emitSocketToUser(socket, 'message', 'error', {
				message: err1.message
			});

			return cooldown(false, true);
		}

		cooldown(false, false);
	});
}

/* ----- INTERNAL USAGE ----- */
function writeMessage(user, socket, message, channel, reply, cooldown){
	cooldown(true, true);

	if(chatService.mode == 0 && !haveRankPermission('exclude_chat_pause', user.rank)) {
		return cooldown(false, true);
	}

	if(usersMessages[user.userid] !== undefined){
		if(chatService.mode == 1 && (usersMessages[user.userid] + config.app.chat.cooldown_massage > time())) {
			return cooldown(false, true);
		}
	}

	usersMessages[user.userid] = time();

	var message = escapeHTML(message).trim();

	if(message.length <= 0) {
		emitSocketToUser(socket, 'message', 'error', {
			message: 'You can\'t send a empty message.'
		});

		return cooldown(false, true);
	}

	if (message.length > 200) message = message.substr(0, 200);

	if((user.restrictions.mute >= time() || user.restrictions.mute == -1) && !haveRankPermission('exclude_mute', user.rank)){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'You are restricted to use our chat. The restriction expires ' + ((user.restrictions.mute == -1) ? 'never' : makeDate(new Date(user.restrictions.mute * 1000))) + '.'
		});

		return cooldown(false, true);
	}

	if(!config.app.chat.channels.includes(channel)){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid chat channel!'
		});

		return cooldown(false, true);
	}

	pool.query('SELECT `id`, `message`, `userid`, `name`, `avatar`, `xp` FROM `chat_messages` WHERE `deleted` = 0 AND `id` = ' + pool.escape(reply), function(err1, row1) {
		if(err1){
			emitSocketToUser(socket, 'message', 'error', {
                message: 'An error occurred while writing message (1)'
            });

			return cooldown(false, true);
		}

		getMentions(message, function(err2, mentions2){
            if(err2) {
                emitSocketToUser(socket, 'message', 'error', {
                    message: err2.message
                });

                return cooldown(false, true);
            }

			getMentions(row1.length > 0 ? row1[0].message : '', function(err3, mentions3){
                if(err3) {
                    emitSocketToUser(socket, 'message', 'error', {
                        message: err3.message
                    });

                    return cooldown(false, true);
                }

				pool.query('INSERT INTO `chat_messages` SET `userid` = ' + pool.escape(user.userid) + ', `name` = ' + pool.escape(user.name) + ', `avatar` = ' + pool.escape(user.avatar) + ', `rank` = ' + parseInt(user.rank) + ', `xp` = ' + parseInt(user.xp) + ', `private` = ' + parseInt(user.settings['private']) + ', `message` = ' + pool.escape(message) + ', `channel` = ' + pool.escape(channel) + ', `reply` = ' + pool.escape(row1.length > 0 ? row1[0].id : null) + ', `time` = ' + pool.escape(time()), function(err4, row4){
					if(err4){
						emitSocketToUser(socket, 'message', 'error', {
                            message: 'An error occurred while writing message (2)'
                        });

						return cooldown(false, true);
					}

					var new_message = {
						type: 'player',
						id: row4.insertId,
						user: {
							userid: user.userid,
							name: user.name,
							avatar: user.avatar,
							level: calculateLevel(user.xp).level
						},
						rank: user.rank,
						private: user.settings['private'],
						message: message,
						channel: channel,
						reply: row1.length > 0 ? {
							id: row1[0].id,
							message: row1[0].message,
							mentions: mentions3,
							user: {
								userid: row1[0].userid,
								name: row1[0].name,
								avatar: row1[0].avatar,
								level: calculateLevel(row1[0].xp).level
							}
						} : null,
						mentions: mentions2,
						time: time()
					}

					emitSocketToRoom('chat_channel_' + channel, 'chat', 'message', {
						message: new_message
					});

					if(chatService.messages[channel] === undefined) chatService.messages[channel] = [];
					chatService.messages[channel].push(new_message);

					if(chatService.messages[channel].length > config.app.chat.max_messages) chatService.messages[channel].shift();

					cooldown(false, false);
				});
			});
		});
	})
}

/* ----- INTERNAL USAGE ----- */
function getMentions(message, callback){
	var array = [];

	if(message.trim().length <= 0) return callback(null, array);

	var reg = /\B@([a-f0-9-]{36})/gi;
	var mentions = message.match(reg);

	if(!mentions) return callback(null, array);
	if(mentions.length <= 0) return callback(null, array);

	// UNIQUE USERID
	mentions = mentions.filter((value, index, self) => self.indexOf(value) === index).map(a => a.replace('@', ''));

	pool.query('SELECT `userid`, `name` FROM `users` WHERE `userid` IN (' + mentions.map(a => '"' + a + '"').join(',') + ')', function(err1, row1){
		if(err1) return callback(new Error('An error occurred while getting mentions (1)'));

		row1.forEach(function(mention){
			array.push({
				mention: '@' + mention.userid,
				name: '@' + mention.name
			});
		});

		callback(null, array);
	});
}

function checkCommand(message){
	if(!message.match(/^\/(\w*)/)) return false;

	return true;
}

/* ----- INTERNAL USAGE ----- */
function getCommand(user, message, callback){
	var response = message.split(/^\/(\w*)/);

	var command = response[1];
	var arguments = response[2].trim();
	arguments = arguments ? arguments.split(/[\s]/) : [];

	if(chatService.commands[command] === undefined) return callback(new Error('Invalid command provided!'));
	if(!chatService.commands[command].enabled) return callback(new Error('Invalid command provided!'));
	if(!chatService.commands[command].allowed.map(a => chatService.ranks[a]).reduce((acc, cur) => ([ ...acc, ...cur ]), []).includes(user.rank)) return callback(true, new Error('Invalid command provided!'));
	if(chatService.commands[command].arguments.length != arguments.length) return callback(new Error('Invalid arguments provided!'));

	for(var [ index, item ] of chatService.commands[command].arguments.entries()){
		var regex = new RegExp(expressions[item.type]);

		if(!regex.test(arguments[index])) return callback(new Error('Invalid command syntax provided!'));
		if(item.plain && !item.name.includes(arguments[index])) return callback(new Error('Invalid command syntax provided!'));
	}

	return callback(null, command, arguments);
}

function useCommand(user, socket, message, channel, callback) {
	getCommand(user, message, function(err1, command, arguments){
		if(err1) return callback(err1);

		if(command == 'help') return useHelpCommand(user, socket, arguments, callback);
		else if(command == 'tip') return useTipCommand(user, socket, arguments, callback);
		else if(command == 'ignore') return useIgnoreCommand(user, socket, arguments, callback);
		else if(command == 'unignore') return useUnignoreCommand(user, socket, arguments, callback);
		else if(command == 'ignorelist') return useIgnoreListCommand(user, socket, arguments, callback);
		else if(command == 'deletemessage') return useDeleteMessageCommand(user, socket, arguments, callback);
		else if(command == 'pinmessage') return usePinMessageCommand(user, socket, arguments, callback);
		else if(command == 'mute') return useMuteCommand(user, socket, arguments, callback);
		else if(command == 'unmute') return useUnmuteCommand(user, socket, arguments, callback);
		else if(command == 'clearchat') return useClearChatCommand(user, socket, arguments, callback);
		else if(command == 'clearchannel') return useClearChannelCommand(user, socket, channel, arguments, callback);
		else if(command == 'chatmode') return useChatModeCommand(user, socket, arguments, callback);
		else if(command == 'chatpoll') return useChatPollCommand(user, socket, arguments, callback);
		else if(command == 'endrain') return useEndRainCommand(user, socket, arguments, callback);
		else if(command == 'online') return useOnlineCommand(user, socket, arguments, callback);
		else if(command == 'pop') return usePopCommand(user, socket, arguments, callback);
	});
}

/* ----- INTERNAL USAGE ----- */
function useHelpCommand(user, socket, arguments, callback){
	var listcommands = [];

	for(var [ index, command ] of Object.entries(chatService.commands)){
		if(command.enabled && command.allowed.map(a => chatService.ranks[a]).reduce((acc, cur) => ([ ...acc, ...cur ]), []).includes(user.rank)){
			var names = [];
			var params = [];

			command.arguments.forEach(function(item){
				var name = item.name.join(' | ');

				if(item.mandatory && item.plain) name = '(' + name + ')';
				else if(!item.mandatory) name = '[' + name + ']';
				else name = '<' + name + '>';

				names.push(name);

				var param = name + ' ' + item.description + '. ';

				if(item.mandatory && item.plain) param = param + 'Required. Pick one of these entries.';
				else if(item.plain) param = param + 'Optional. Pick one of these entries.';
				else if(!item.mandatory) param = param + 'This entry is optional.';
				else param = param + 'This entry is required.';

				params.push(param)
			});

			listcommands.push({
				command: index,
				arguments: names,
				help: [ ...command.help.map(a => a + '.'), ...params ]
			});
		}
	}

	emitSocketToUser(socket, 'modal', 'command_help', {
		commands: listcommands
	});

	callback(null);
}

/* ----- INTERNAL USAGE ----- */
function useTipCommand(user, socket, arguments, callback){
	pool.query('SELECT `userid`, `name`, `avatar`, `xp` FROM `users` WHERE `userid` = ' + pool.escape(arguments[0]), function(err1, row1) {
		if(err1) return callback(new Error('An error occurred while using tip command (1)'));

		if(row1.length == 0) return callback(new Error('Unknown user!'));

		emitSocketToUser(socket, 'modal', 'command_tip', {
			user: {
				userid: row1[0].userid,
				name: row1[0].name,
				avatar: row1[0].avatar,
				level: calculateLevel(row1[0].xp).level
			}
		});

		callback(null);
	});
}

/* ----- INTERNAL USAGE ----- */
function useIgnoreCommand(user, socket, arguments, callback){
	var userid = arguments[0];

	if(userid == user.userid) return callback(new Error('You cannot ignore yourself!'));

	pool.query('SELECT `userid`, `name`, `avatar`, `xp` FROM `users` WHERE `userid` = ' + pool.escape(userid), function(err1, row1) {
		if(err1) return callback(new Error('An error occurred while using ignore command (1)'));

		if(row1.length <= 0) return callback(new Error('Unknown user!'));

		pool.query('SELECT * FROM `chat_ignore` WHERE `userid` = ' + pool.escape(user.userid) + ' AND `ignoreid` = ' + pool.escape(userid) + ' AND `removed` = 0', function(err2, row2){
			if(err2) return callback(new Error('An error occurred while using ignore command (2)'));

			if(row2.length > 0) return callback(new Error('This user is already ignored!'));

			pool.query('INSERT INTO `chat_ignore` SET `userid` = ' + pool.escape(user.userid) + ', `ignoreid` = ' + pool.escape(userid) + ', `time` = ' + pool.escape(time()), function(err3){
				if(err3) return callback(new Error('An error occurred while using ignore command (3)'));

				if(chatService.ignoreList[user.userid] === undefined) chatService.ignoreList[user.userid] = {};

				chatService.ignoreList[user.userid][userid] = {
					user: {
						userid: row1[0].userid,
						name: row1[0].name,
						avatar: row1[0].avatar,
						level: calculateLevel(row1[0].xp).level
					},
					time: makeDate(new Date(time() * 1000))
				};

				emitSocketToUser(socket, 'chat', 'ignorelist', {
					list: Object.keys(chatService.ignoreList[user.userid])
				});

				emitSocketToUser(socket, 'message', 'info', {
					message: 'User ' + row1[0].name + ' successfully ignored!'
				});

				callback(null);
			});
		});
	});
}

/* ----- INTERNAL USAGE ----- */
function useUnignoreCommand(user, socket, arguments, callback){
	var userid = arguments[0];

	pool.query('SELECT `name` FROM `users` WHERE `userid` = ' + pool.escape(userid), function(err1, row1) {
		if(err1) return callback(new Error('An error occurred while using unignore command (1)'));

		if(row1.length <= 0) return callback(new Error('Unknown user!'));

		pool.query('SELECT * FROM `chat_ignore` WHERE `userid` = ' + pool.escape(user.userid) + ' AND `ignoreid` = ' + pool.escape(userid) + ' AND `removed` = 0', function(err2, row2){
			if(err2) return callback(new Error('An error occurred while using unignore command (2)'));

			if(row2.length <= 0) return callback(new Error('This user is not ignored!'));

			pool.query('UPDATE `chat_ignore` SET `removed` = 1 WHERE `userid` = ' + pool.escape(user.userid) + ' AND `ignoreid` = ' + pool.escape(userid) + ' AND `removed` = 0', function(err3){
				if(err3) return callback(new Error('An error occurred while using unignore command (3)'));

				if(chatService.ignoreList[user.userid][userid] !== undefined) delete chatService.ignoreList[user.userid][userid];

				emitSocketToUser(socket, 'chat', 'ignorelist', {
					list: Object.keys(chatService.ignoreList[user.userid])
				});

				emitSocketToUser(socket, 'message', 'info', {
					message: 'User ' + row1[0].name + ' successfully unignored!'
				});

				callback(null);
			});
		});
	});
}

/* ----- INTERNAL USAGE ----- */
function useIgnoreListCommand(user, socket, arguments, callback){
	if(chatService.ignoreList[user.userid] === undefined){
		emitSocketToUser(socket, 'modal', 'command_ignorelist', {
			list: []
		});

		return callback(null);
	}

	emitSocketToUser(socket, 'modal', 'command_ignorelist', {
		list: Object.values(chatService.ignoreList[user.userid])
	});

	callback(null);
}

/* ----- INTERNAL USAGE ----- */
function useDeleteMessageCommand(user, socket, arguments, callback){
	var messageid = parseInt(arguments[0]);

	deleteMessage(0, 0);

	function deleteMessage(index, count){
		if(index >= Object.keys(chatService.messages).length) {
			if(count <= 0) return callback(new Error('Unknown message id or already deleted!'));

			return callback(null);
		}

		var message_index = chatService.messages[Object.keys(chatService.messages)[index]].findIndex(item => item.id == messageid);

		if(message_index < 0) return deleteMessage(index + 1, count);

		pool.query('UPDATE `chat_messages` SET `deleted` = 1 WHERE `id` = ' + messageid + ' AND `deleted` = 0', function(err1, row1){
			if(err1) return callback(new Error('An error occurred while using delete message command (1)'));

			if(row1.affectedRows <= 0) return deleteMessage(index + 1, count);

			chatService.messages[Object.keys(chatService.messages)[index]].splice(message_index, 1);

			emitSocketToRoom('chat_channel_' + Object.keys(chatService.messages)[index], 'chat', 'delete', {
				id: messageid
			});

			return deleteMessage(index + 1, count + 1);
		});
	}
}

/* ----- INTERNAL USAGE ----- */
function usePinMessageCommand(user, socket, arguments, callback){
	callback(null);
}

/* ----- INTERNAL USAGE ----- */
function useMuteCommand(user, socket, arguments, callback){
	pool.query('SELECT `userid`, `name`, `avatar`, `xp` FROM `users` WHERE `userid` = ' + pool.escape(arguments[0]), function(err1, row1) {
		if(err1) return callback(new Error('An error occurred while using pin message command (1)'));

		if(row1.length == 0) return callback(new Error('Unknown user!'));

		emitSocketToUser(socket, 'modal', 'command_mute', {
			user: {
				userid: row1[0].userid,
				name: row1[0].name,
				avatar: row1[0].avatar,
				level: calculateLevel(row1[0].xp).level
			}
		});

		callback(null);
	});
}

/* ----- INTERNAL USAGE ----- */
function useUnmuteCommand(user, socket, arguments, callback){
	userService.unsetRestrictionAccount(user, socket, {
		userid: arguments[0],
		restriction: 'mute'
	}, function(err1){
		if(err1) return callback(err1);

		emitSocketToUser(socket, 'message', 'success', {
			message: 'The user was successfully unrestricted!'
		});

		callback(null);
	});
}

/* ----- INTERNAL USAGE ----- */
function useClearChatCommand(user, socket, arguments, callback){
	Object.keys(chatService.messages).forEach(function(item){
		chatService.messages[item] = [];

		emitSocketToRoom('chat_channel_' + item, 'chat', 'clean');

		var text_message = 'Chat history has been wiped!';
		writeSystemMessage(text_message, item, true, null);
	});

	callback(null);
}

/* ----- INTERNAL USAGE ----- */
function useClearChannelCommand(user, socket, channel, arguments, callback){
	chatService.messages[channel] = [];

	emitSocketToRoom('chat_channel_' + channel, 'chat', 'clean');

	var text_message = 'Chat history has been wiped!';
	writeSystemMessage(text_message, channel, true, null);

	callback(null);
}

/* ----- INTERNAL USAGE ----- */
function useChatModeCommand(user, socket, arguments, callback){
	var mods = [ 'pause', 'normal', 'fast' ];

	chatService.mode = mods.indexOf(arguments[0]);

	var text_message = 'Chat has changed to ' + chatService.mode + ' mode.';
	writeSystemMessage(text_message, 'all', true, null);

	callback(null);
}

/* ----- INTERNAL USAGE ----- */
function useChatPollCommand(user, socket, arguments, callback){
	callback(null);
}

/* ----- INTERNAL USAGE ----- */
function useEndRainCommand(user, socket, arguments, callback){
	if(rainService.gameProperties.status != 'waiting') return callback(new Error('You can only roll the rain until starts!'));

	rainService.rollGame();

	callback(null);
}

/* ----- INTERNAL USAGE ----- */
function useOnlineCommand(user, socket, arguments, callback){
	var list = [];

	config.app.chat.channels.forEach(function(channel){
		if(usersOnline[channel] !== undefined){
			Object.keys(usersOnline[channel]).filter(a => !usersOnline[channel][a].guest).forEach(function(item){
				list.push({
					channel: channel,
					paths: usersOnline[channel][item].paths,
					user: usersOnline[channel][item].user
				});
			});
		}
	});

	emitSocketToUser(socket, 'modal', 'command_online', {
		list: list
	});

	callback(null);
}

/* ----- INTERNAL USAGE ----- */
function usePopCommand(user, socket, arguments, callback){
	var users = config.app.chat.channels.reduce((acc, cur) => acc + Object.keys(usersOnline[cur] || {}).filter(a => !usersOnline[cur][a].guest).length, 0);
	var guests = config.app.chat.channels.reduce((acc, cur) => acc + Object.keys(usersOnline[cur] || {}).filter(a => usersOnline[cur][a].guest).length, 0);

	var text_message = 'There are connected ' + users + ' players and ' + guests + ' guests on website. Thank you for playing!';
	writeSystemMessage(text_message, null, null, socket);

	callback(null);
}

module.exports = {
	messages: chatService.messages, ignoreList: chatService.ignoreList, usersChannels, commands: chatService.commands, ranks: chatService.ranks,
	initializeChat, writeSystemMessage,
	loadChannel, loadCommands, checkMessage, checkCommand, useCommand
};