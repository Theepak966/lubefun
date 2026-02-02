var express = require('express');
var router = express.Router();

var accountControllers = require('@/controllers/accountControllers.js');

router.get('/', accountControllers.accountUnset);
router.get('/settings', accountControllers.accountSettings);
router.get('/deposits', accountControllers.accountDeposits);
router.get('/withdrawals', accountControllers.accountWithdrawals);
router.get('/games', accountControllers.accountGamesUnset);
router.get('/games/crash', accountControllers.accountGamesCrash);
router.get('/games/coinflip', accountControllers.accountGamesCoinflip);
router.get('/games/blackjack', accountControllers.accountGamesBlackjack);
router.get('/games/tower', accountControllers.accountGamesTower);
router.get('/games/minesweeper', accountControllers.accountGamesMinesweeper);
router.get('/games/casino', accountControllers.accountGamesCasino);
router.get('/transactions', accountControllers.accountTransactions);
router.get('/exclusion', accountControllers.accountExclusion);
router.get('/security', accountControllers.accountSecurity);

module.exports = router;