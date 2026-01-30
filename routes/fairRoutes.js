var express = require('express');
var router = express.Router();

var fairControllers = require('@/controllers/fairControllers.js');

router.get('/', fairControllers.fair);

module.exports = router;