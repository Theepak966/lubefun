var express = require('express');
var router = express.Router();

var coinflipControllers = require('@/controllers/coinflipControllers.js');

router.get('/', coinflipControllers.coinflip);

module.exports = router;