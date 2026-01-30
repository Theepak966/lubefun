var express = require('express');
var router = express.Router();

var loginControllers = require('@/controllers/loginControllers.js');

router.get('/', loginControllers.login);
router.get('/forgot-password', loginControllers.forgotPassword);
router.get('/forgot-password/success', loginControllers.forgotPasswordSuccess);
router.get('/reset-password', loginControllers.resetPassword);
router.get('/reset-password/expired', loginControllers.resetPasswordExpired);
router.get('/reset-password/success', loginControllers.resetPasswordSuccess);

module.exports = router;