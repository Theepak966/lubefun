var express = require('express');
var router = express.Router();

var affiliatesControllers = require('@/controllers/affiliatesControllers.js');

router.get('/', affiliatesControllers.affiliates);

module.exports = router;