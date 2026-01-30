var { pool } = require('@/lib/database.js');

var config = require('@/config/config.js');

var { calculateLevel } = require('@/utils/utils.js');
var { roundedToFixed, getFormatAmountString } = require('@/utils/formatAmount.js');
var { makeDate, time } = require('@/utils/formatDate.js');

exports.supportUnset = async (req, res) => {
    res.redirect('/support/new');
};

exports.supportNew = async (req, res) => {
    if(!res.locals.user) return res.redirect('/login?returnUrl=/support/new');

    res.render('supportNew', {
        page: 'support',
        name: config.app.pages['support']
    });
};

exports.supportRequests = async (req, res, next) => {
    if(!res.locals.user) return res.redirect('/login?returnUrl=/support/new');

    pool.query('SELECT COUNT(*) AS `count` FROM `support_requests` WHERE `userid` = ' + pool.escape(res.locals.user.userid), function(err1, row1) {
        if(err1) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering support requests page (1)' });

        pool.query('SELECT `subject`, `department`, `closed`, `status`, `requestid`, `update`, `time` FROM `support_requests` WHERE `userid` = ' + pool.escape(res.locals.user.userid) + ' ORDER BY `id` DESC LIMIT 10', function(err2, row2) {
            if(err2) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering support requests page (2)' });

            var pages = Math.ceil(row1[0].count / 10);

            res.render('supportRequests', {
                page: 'support',
                name: config.app.pages['support'],
                response: {
                    support: {
                        requests: {
                            list: row2.map(function(item){
                                return {
                                    id: item.requestid,
                                    subject: item.subject,
                                    department: parseInt(item.department),
                                    closed: parseInt(item.closed),
                                    status: parseInt(item.status),
                                    created: makeDate(new Date(item.time * 1000)),
                                    updated: makeDate(new Date(item.update * 1000))
                                }
                            }),
                            pages: pages > 0 ? pages : 1,
                            page: 1
                        }
                    }
                }
            });
        });
    });
};

exports.supportRequest = async (req, res, next) => {
    if(!res.locals.user) return res.redirect('/login?returnUrl=/support/requests/' + req.params.id);

    var { id } = req.params;

    pool.query('SELECT `id`, `closed`, `status`, `name`, `subject`, `department`, `requestid`, `update`, `time` FROM `support_requests` WHERE `requestid` = ' + pool.escape(id) + ' AND `userid` = ' + pool.escape(res.locals.user.userid), function(err1, row1) {
        if(err1) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering support request page (1)' });

        if(row1.length <= 0) return next();

        pool.query('SELECT * FROM `support_messages` WHERE `requestid` = ' + pool.escape(row1[0].id) + ' ORDER BY `id` ASC', function(err2, row2) {
            if(err2) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering support request page (2)' });

            res.render('supportRequest', {
                page: 'support',
                name: config.app.pages['support'],
                response: {
                    support: {
                        request: {
                            id: row1[0].requestid,
                            requester: row1[0].name,
                            subject: row1[0].subject,
                            department: parseInt(row1[0].department),
                            closed: parseInt(row1[0].closed),
                            status: parseInt(row1[0].status),
                            created: makeDate(new Date(row1[0].time * 1000)),
                            updated: makeDate(new Date(row1[0].update * 1000))
                        },
                        messages: row2.map(function(item){
                            return {
                                user: {
                                    userid: item.userid,
                                    name: item.name,
                                    avatar: item.avatar,
                                    level: calculateLevel(item.xp).level
                                },
                                response: parseInt(item.response) == 1,
                                message: item.message,
                                date: makeDate(new Date(item.time * 1000))
                            }
                        })
                    }
                }
            });
        });
    });
};