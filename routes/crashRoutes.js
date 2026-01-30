var express = require('express');
var router = express.Router();

var crashControllers = require('@/controllers/crashControllers.js');

router.get('/', crashControllers.crash);

module.exports = router;