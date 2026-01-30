var { pool } = require('@/lib/database.js');

var { getFormatAmountString } = require('@/utils/formatAmount.js');

var config = require('@/config/config.js');

exports.leaderboard = async (req, res, next) => {
    pool.query('SELECT users.userid, users.name, users.avatar, bets_table.games, bets_table.bets, bets_table.winnings FROM `users` INNER JOIN (SELECT users_transactions.userid, SUM(IF(users_transactions.amount > 0, 0, -users_transactions.amount)) AS `bets`, SUM(IF(users_transactions.amount > 0, users_transactions.amount, 0)) AS `winnings`, SUM(users_transactions.amount) AS `profit`, SUM(IF(users_transactions.amount > 0, 0, 1)) AS `games` FROM `users_transactions` WHERE users_transactions.service LIKE "%_bet" OR users_transactions.service LIKE "%_win" OR users_transactions.service LIKE "%_refund" OR users_transactions.service LIKE "%_cashback" GROUP BY users_transactions.userid ORDER BY `bets` DESC) AS `bets_table` ON users.userid = bets_table.userid WHERE users.bot = 0 ORDER BY bets_table.bets DESC LIMIT 20', function(err1, row1) {
        if(err1) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering leaderboard page (1)' });

        res.render('leaderboard', {
            page: 'leaderboard',
            name: config.app.pages['leaderboard'],
            response: {
                leaderboard: row1.map(a => ({
                    userid: a.userid,
                    name: a.name,
                    avatar: a.avatar,
                    games: parseInt(a.games),
                    bets: getFormatAmountString(a.bets),
                    winnings: getFormatAmountString(a.winnings)
                }))
            }
        });
    });
};