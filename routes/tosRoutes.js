var express = require('express');
var router = express.Router();

var tosControllers = require('@/controllers/tosControllers.js');

router.get('/', tosControllers.tos);

module.exports = router;