var crypto = require('crypto');

var { pool } = require('@/lib/database.js');

var { makeDate } = require('@/utils/formatDate.js');

var config = require('@/config/config.js');

exports.fair = async (req, res, next) => {
    var response = {
        fair: {
            client_seed: null,
            server_seed: null,
            server_seeds: []
        }
    };

    if(!res.locals.user) return res.render('fair', {
        page: 'fair',
        name: config.app.pages['fair'],
        response: response
    });

    pool.query('SELECT * FROM `users_seeds_server` WHERE `userid` = ' + pool.escape(res.locals.user.userid) + ' ORDER BY `id` DESC LIMIT 10', function(err1, row1) {
        if(err1) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering provably fair page (1)' });

        pool.query('SELECT `seed` FROM `users_seeds_server` WHERE `userid` = ' + pool.escape(res.locals.user.userid) + ' AND `removed` = 0 ORDER BY `id` DESC LIMIT 1', function(err2, row2) {
            if(err2) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering provably fair page (2)' });

            pool.query('SELECT `seed` FROM `users_seeds_client` WHERE `userid` = ' + pool.escape(res.locals.user.userid) + ' AND `removed` = 0 ORDER BY `id` DESC LIMIT 1', function(err3, row3) {
                if(err3) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering provably fair page (3)' });

                response.fair.client_seed = row3[0].seed;
                response.fair.server_seed = crypto.createHash('sha256').update(row2[0].seed).digest('hex');

                response.fair.server_seeds = row1.map(a => ({
                    id: a.id,
                    using: parseInt(a.removed) == 0,
                    seed: parseInt(a.removed) == 0 ? crypto.createHash('sha256').update(a.seed).digest('hex') : a.seed,
                    nonce: a.nonce,
                    date: makeDate(new Date(a.time * 1000))
                }));

                res.render('fair', {
                    page: 'fair',
                    name: config.app.pages['fair'],
                    response: response
                });
            });
        });
    });
};