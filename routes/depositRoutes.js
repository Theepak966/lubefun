var express = require('express');
var router = express.Router();

var depositControllers = require('@/controllers/depositControllers.js');

router.get('/', depositControllers.deposit);
router.get('/crypto/:method', depositControllers.depositCrypto);

module.exports = router;