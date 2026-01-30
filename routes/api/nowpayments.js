var express = require('express');
var router = express.Router();

var nowpaymentsControllers = require('@/controllers/api/nowpayments.js');

router.post('/callback', nowpaymentsControllers.callback);

module.exports = router;