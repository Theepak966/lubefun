var express = require('express');
var router = express.Router();

router.use('/', require('@/routes/homeRoutes.js'));
router.use('/crash', require('@/routes/crashRoutes.js'));
router.use('/coinflip', require('@/routes/coinflipRoutes.js'));
router.use('/blackjack', require('@/routes/blackjackRoutes.js'));
router.use('/tower', require('@/routes/towerRoutes.js'));
router.use('/mines', require('@/routes/minesRoutes.js'));
router.use('/minesweeper', require('@/routes/minesweeperRoutes.js'));
router.use('/slots', require('@/routes/slotsRoutes.js'));
router.use('/casino', require('@/routes/casinoRoutes.js'));

router.use('/deposit', require('@/routes/depositRoutes.js'));
router.use('/withdraw', require('@/routes/withdrawRoutes.js'));

router.use('/fair', require('@/routes/fairRoutes.js'));
router.use('/faq', require('@/routes/faqRoutes.js'));
router.use('/tos', require('@/routes/tosRoutes.js'));
router.use('/support', require('@/routes/supportRoutes.js'));
router.use('/leaderboard', require('@/routes/leaderboardRoutes.js'));
router.use('/rewards', require('@/routes/rewardsRoutes.js'));
router.use('/affiliates', require('@/routes/affiliatesRoutes.js'));
router.use('/account', require('@/routes/accountRoutes.js'));

router.use('/user', require('@/routes/userRoutes.js'));

router.use('/admin', require('@/routes/adminRoutes.js'));

module.exports = router;