var express = require('express');
var router = express.Router();

var adminControllers = require('@/controllers/adminControllers.js');

router.get('/', adminControllers.adminUnset);
router.get('/dashboard/', adminControllers.adminDashboardUnset);
router.get('/dashboard/summary', adminControllers.adminDashboardSummary);
router.get('/dashboard/games', adminControllers.adminDashboardGamesUnset);
router.get('/dashboard/games/summary', adminControllers.adminDashboardGamesSummary);
router.get('/dashboard/games/:game', adminControllers.adminDashboardGame);
router.get('/dashboard/payments', adminControllers.adminDashboardPaymentsDefault);
router.get('/dashboard/payments/summary', adminControllers.adminDashboardPaymentsSummary);
router.get('/dashboard/payments/deposits', adminControllers.adminDashboardPaymentsDeposits);
router.get('/dashboard/payments/withdrawals', adminControllers.adminDashboardPaymentsWithdrawals);

router.get('/settings', adminControllers.adminSettings);

router.get('/users', adminControllers.adminUsers);
router.get('/users/:userid', adminControllers.adminUser);

router.get('/games', adminControllers.adminGames);
router.get('/payments', adminControllers.adminPayments);

router.get('/gamebots', adminControllers.adminGamebots);

router.get('/support', adminControllers.adminSupportUnset);
router.get('/support/requests', adminControllers.adminSupportRequests);
router.get('/support/requests/:id', adminControllers.adminSupportRequest);

module.exports = router;