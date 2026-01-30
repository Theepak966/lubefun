var express = require('express');
var router = express.Router();

var twofaControllers = require('@/controllers/twofaControllers.js');

router.get('/', twofaControllers.twofa);
router.get('/authenticator-app', twofaControllers.authenticatorApp);
router.get('/email-verification', twofaControllers.emailVerification);
router.get('/recovery-code', twofaControllers.recoveryCode);
router.get('/expired', twofaControllers.expired);
router.get('/options', twofaControllers.options);

router.get('/send-email-verification', twofaControllers.sendEmailVerification);

module.exports = router;