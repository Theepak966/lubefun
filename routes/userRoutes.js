var express = require('express');
var router = express.Router();

var userControllers = require('@/controllers/userControllers.js');

router.get('/private', userControllers.userPrivate);
router.get('/:userid', userControllers.userUnset);
router.get('/:userid/deposits', userControllers.userDeposits);
router.get('/:userid/withdrawals', userControllers.userWithdrawals);
router.get('/:userid/games', userControllers.userGamesUnset);
router.get('/:userid/games/crash', userControllers.userGamesCrash);
router.get('/:userid/games/coinflip', userControllers.userGamesCoinflip);
router.get('/:userid/games/blackjack', userControllers.userGamesBlackjack);
router.get('/:userid/games/tower', userControllers.userGamesTower);
router.get('/:userid/games/minesweeper', userControllers.userGamesMinesweeper);
router.get('/:userid/games/casino', userControllers.userGamesCasino);
router.get('/:userid/transactions', userControllers.userTransactions);

module.exports = router;