var express = require('express');
var router = express.Router();

var authControllers = require('@/controllers/api/auth.js');

var limiter = require('@/middleware/limiter.js');

router.post('/login', limiter.login, authControllers.login);
router.post('/register', limiter.register, authControllers.register);

router.get('/google', limiter.google, authControllers.google);
router.get('/google/callback', authControllers.googleCallback);
router.get('/discord', limiter.discord, authControllers.discord);
router.get('/discord/callback', authControllers.discordCallback);
router.get('/steam', limiter.steam, authControllers.steam);
router.get('/steam/callback', authControllers.steamCallback);

router.post('/forgot-password', limiter.recover, authControllers.forgotPassword);
router.post('/reset-password', limiter.recover, authControllers.resetPassword);

router.get('/logout', authControllers.logout);

router.post('/change-password', authControllers.changePassword);

router.get('/change-email', authControllers.changeEmail);

router.post('/set-password', authControllers.setPassword);
router.post('/set-email', authControllers.setEmailRequest);
router.get('/set-email', authControllers.setEmail);

router.post('/authorize/account', authControllers.authorizeAccount);
router.post('/authorize/admin', authControllers.authorizeAdmin);

module.exports = router;