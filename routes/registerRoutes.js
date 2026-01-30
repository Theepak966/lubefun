var express = require('express');
var router = express.Router();

var registerControllers = require('@/controllers/registerControllers.js');

router.get('/', registerControllers.register);
router.get('/set-password', registerControllers.setPassword);
router.get('/set-email', registerControllers.setEmail);
router.get('/set-email/success', registerControllers.setEmailSuccess);

module.exports = router;