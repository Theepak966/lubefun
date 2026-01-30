var express = require('express');
var router = express.Router();

var homeControllers = require('@/controllers/homeControllers.js');

router.get('/', homeControllers.home);

module.exports = router;