var express = require('express');
var router = express.Router();

var withdrawControllers = require('@/controllers/withdrawControllers.js');

router.get('/', withdrawControllers.withdraw);
router.get('/crypto/:method', withdrawControllers.withdrawCrypto);

module.exports = router;