var express = require('express');
var router = express.Router();

var twofaControllers = require('@/controllers/api/twofa.js');

var limiter = require('@/middleware/limiter.js');

router.post('/authenticator-app', limiter.twofa, twofaControllers.authenticatorApp);
router.post('/email-verification', limiter.twofa, twofaControllers.emailVerification);
router.post('/recovery-code', limiter.twofa, twofaControllers.recoveryCode);

module.exports = router;