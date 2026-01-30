var { pool } = require('@/lib/database.js');
var { emitSocketToUser, emitSocketToRoom } = require('@/lib/socket.js');
var { uuid } = require('@/lib/uuid.js');

var { makeDate, time } = require('@/utils/formatDate.js');
var { calculateLevel, escapeHTML } = require('@/utils/utils.js');

var config = require('@/config/config.js');

/* ----- CLIENT USAGE ----- */
function createRequest(user, socket, subject, department, message, cooldown) {
    cooldown(true, true);

    /* CHECK DATA */

    subject = subject.trim();

	if(subject.length < config.app.support.requirements.subject_length.min || subject.length > config.app.support.requirements.subject_length.max){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid subject length [' + config.app.support.requirements.subject_length.min + '-' + config.app.support.requirements.subject_length.max + ']!'
		});

		return cooldown(false, true);
	}

    subject = escapeHTML(subject);

    if(isNaN(Number(department))){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid department!'
		});

		return cooldown(false, true);
	}

	department = parseInt(department);

	var allowed_departments = [ 0, 1, 2, 3, 4, 5 ];
	if(!allowed_departments.includes(department)){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid department!'
		});

		return cooldown(false, true);
	}

    message = message.trim();

	if(message.length < config.app.support.requirements.message_length.min || message.length > config.app.support.requirements.message_length.max){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid message length [' + config.app.support.requirements.message_length.min + '-' + config.app.support.requirements.message_length.max + ']!'
		});

		return cooldown(false, true);
	}

    message = escapeHTML(message);

    /* END CHECK DATA */

	var requestid = uuid.uuidv4();

    pool.query('INSERT `support_requests` SET `userid` = ' + pool.escape(user.userid) + ', `name` = ' + pool.escape(user.name) + ', `avatar` = ' + pool.escape(user.avatar) + ', `xp` = ' + pool.escape(user.xp) + ', `subject` = ' + pool.escape(subject) + ', `department` = ' + pool.escape(department) + ', `requestid` = ' + pool.escape(requestid) + ', `update` = ' + pool.escape(time()) + ', `time` = ' + pool.escape(time()), function(err1, row1){
        if(err1) {
            emitSocketToUser(socket, 'message', 'error', {
                message: 'An error occurred while creating request (1)'
            });

            return cooldown(false, true);
        }

        pool.query('INSERT `support_messages` SET `userid` = ' + pool.escape(user.userid) + ', `name` = ' + pool.escape(user.name) + ', `avatar` = ' + pool.escape(user.avatar) + ', `xp` = ' + pool.escape(user.xp) + ', `message` = ' + pool.escape(message) + ', `requestid` = ' + pool.escape(row1.insertId) + ', `time` = ' + pool.escape(time()), function(err2, row2){
            if(err2) {
                emitSocketToUser(socket, 'message', 'error', {
                    message: 'An error occurred while creating request (2)'
                });

                return cooldown(false, true);
            }

            emitSocketToUser(socket, 'support', 'redirect', {
                id: requestid
            });

            emitSocketToUser(socket, 'message', 'success', {
                message: 'You successfully created a support request!'
            });

            cooldown(false, false);
        });
    });
}

/* ----- CLIENT USAGE ----- */
function replyRequest(user, socket, id, message, cooldown) {
    cooldown(true, true);

    /* CHECK DATA */

    message = message.trim();

    if(message.length < config.app.support.requirements.message_length.min || message.length > config.app.support.requirements.message_length.max){
        emitSocketToUser(socket, 'message', 'error', {
            message: 'Invalid message length [' + config.app.support.requirements.message_length.min + '-' + config.app.support.requirements.message_length.max + ']!'
        });

        return cooldown(false, true);
    }

    message= escapeHTML(message);

    /* END CHECK DATA */

    pool.query('SELECT `id`, `status`, `name` FROM `support_requests` WHERE `requestid` = ' + pool.escape(id) + ' AND `userid` = ' + pool.escape(user.userid) + ' AND `status` != 3', function(err1, row1){
        if(err1) {
            emitSocketToUser(socket, 'message', 'error', {
                message: 'An error occurred while replying request (1)'
            });

            return cooldown(false, true);
        }

        if(row1.length <= 0) {
            emitSocketToUser(socket, 'message', 'error', {
                message: 'Invalid support request or already closed!'
            });

            return cooldown(false, true);
        }

        var update = time();

        pool.query('INSERT `support_messages` SET `userid` = ' + pool.escape(user.userid) + ', `name` = ' + pool.escape(user.name) + ', `avatar` = ' + pool.escape(user.avatar) + ', `xp` = ' + pool.escape(user.xp) + ', `message` = ' + pool.escape(message) + ', `requestid` = ' + pool.escape(row1[0].id) + ', `time` = ' + pool.escape(update), function(err2, row2){
            if(err2) {
                emitSocketToUser(socket, 'message', 'error', {
                    message: 'An error occurred while replying request (2)'
                });

                return cooldown(false, true);
            }

            var status = 0;
            if(parseInt(row1[0].status) > 0) status = 1;

            pool.query('UPDATE `support_requests` SET `status` = ' + pool.escape(status) + ', `update` = ' + pool.escape(update) + ' WHERE `id` = ' + pool.escape(row1[0].id) + ' AND `userid` = ' + pool.escape(user.userid) + ' AND `status` != 3', function(err3, row3){
                if(err3) {
                    emitSocketToUser(socket, 'message', 'error', {
                        message: 'An error occurred while replying request (3)'
                    });

                    return cooldown(false, true);
                }

                emitSocketToRoom('admin/support/requests/' + id, 'admin', 'support_reply', {
                    closed: 0,
                    status: status,
                    user: {
                        userid: user.userid,
                        name: user.name,
                        avatar: user.avatar,
                        level: calculateLevel(user.xp).level
                    },
                    requester: row1[0].name,
                    response: 0,
                    message: message,
                    date: makeDate(new Date(update * 1000))
                });

                emitSocketToUser(socket, 'support', 'reply', {
                    closed: 0,
                    status: status,
                    user: {
                        userid: user.userid,
                        name: user.name,
                        avatar: user.avatar,
                        level: calculateLevel(user.xp).level
                    },
                    requester: row1[0].name,
                    response: 0,
                    message: message,
                    date: makeDate(new Date(update * 1000))
                });

                emitSocketToUser(socket, 'message', 'success', {
                    message: 'You successfully reply to your support request!'
                });

                cooldown(false, false);
            });
        });
    });
}

/* ----- CLIENT USAGE ----- */
function closeRequest(user, socket, id, cooldown) {
    cooldown(true, true);

    pool.query('SELECT `id`, `name` FROM `support_requests` WHERE `requestid` = ' + pool.escape(id) + ' AND `userid` = ' + pool.escape(user.userid) + ' AND `status` != 3', function(err1, row1){
        if(err1) {
            emitSocketToUser(socket, 'message', 'error', {
                message: 'An error occurred while closing request (1)'
            });

            return cooldown(false, true);
        }

        if(row1.length <= 0) {
            emitSocketToUser(socket, 'message', 'error', {
                message: 'Invalid support request or already closed!'
            });

            return cooldown(false, true);
        }

        var update = time();

        pool.query('UPDATE `support_requests` SET `closed` = 1, `update` = ' + pool.escape(update) + ' WHERE `id` = ' + pool.escape(row1[0].id) + ' AND `userid` = ' + pool.escape(user.userid) + ' AND `status` != 3', function(err2, row2){
            if(err2) {
                emitSocketToUser(socket, 'message', 'error', {
                    message: 'An error occurred while closing request (2)'
                });

                return cooldown(false, true);
            }

            emitSocketToRoom('admin/support/requests/' + id, 'admin', 'support_close', {
                closed: 1,
                date: makeDate(new Date(update * 1000))
            });

            emitSocketToUser(socket, 'support', 'close', {
                closed: 1,
                date: makeDate(new Date(update * 1000))
            });

            emitSocketToUser(socket, 'message', 'success', {
                message: 'You successfully closed to your support request!'
            });

            cooldown(false, false);
        });
    });
}

/* ----- CLIENT USAGE ----- */
function getSupportRequests(user, socket, page, status, search, cooldown){
    cooldown(true, true);

	var status_allowed = [ 0, 1, 2, 3, 4 ];
	if(!status_allowed.includes(status)){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid status!'
		});

		return cooldown(false, true);
	}

	if(isNaN(Number(page))){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid page!'
		});

		return cooldown(false, true);
	}

	page = parseInt(page);
	search = search.trim();

    var status_query = {
        0: 'AND `status` IN (0, 1, 2)',
        1: 'AND `status` IN (0, 1)',
        2: 'AND `status` = 2',
        3: 'AND `closed` = 1'
    }[status];

	pool.query('SELECT COUNT(*) AS `count` FROM `support_requests` WHERE `userid` = ' + pool.escape(user.userid) + ' ' + status_query + ' AND (`requestid` LIKE ' + pool.escape('%' + search + '%') + ' OR `subject` LIKE ' + pool.escape('%' + search + '%') + ')', function(err1, row1){
		if(err1){
			emitSocketToUser(socket, 'message', 'error', {
                message: 'An error occurred while getting support requests (1)'
            });

			return cooldown(false, true);
		}

		var pages = Math.ceil(row1[0].count / 10);

		if(pages <= 0){
			emitSocketToUser(socket, 'pagination', 'support_requests', {
				list: [],
				pages: 1,
				page: 1
			});

			return cooldown(false, false);
		}

		if(page <= 0 || page > pages) {
			emitSocketToUser(socket, 'message', 'error', {
				message: 'Invalid page!'
			});

			return cooldown(false, true);
		}

		pool.query('SELECT `subject`, `department`, `closed`, `status`, `requestid`, `update`, `time` FROM `support_requests` WHERE `userid` = ' + pool.escape(user.userid) + ' ' + status_query + ' AND (`requestid` LIKE ' + pool.escape('%' + search + '%') + ' OR `subject` LIKE ' + pool.escape('%' + search + '%') + ')' + ' ORDER BY `id` DESC LIMIT 10 OFFSET ' + pool.escape(page * 10 - 10), function(err2, row2){
			if(err2){
				emitSocketToUser(socket, 'message', 'error', {
                    message: 'An error occurred while getting support requests (2)'
                });

				return cooldown(false, true);
			}

			var list = row2.map(a => ({
				id: a.requestid,
                subject: a.subject,
                department: parseInt(a.department),
                closed: parseInt(a.closed),
                status: parseInt(a.status),
                created: makeDate(new Date(a.time * 1000)),
                updated: makeDate(new Date(a.update * 1000))
			}));

			emitSocketToUser(socket, 'pagination', 'support_requests', {
				list: list,
				pages: pages,
				page: page
			});

			cooldown(false, false);
		});
	});
}

module.exports = {
    createRequest, replyRequest, closeRequest, getSupportRequests
};