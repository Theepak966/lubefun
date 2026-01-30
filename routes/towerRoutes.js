var express = require('express');
var router = express.Router();

var towerControllers = require('@/controllers/towerControllers.js');

router.get('/', towerControllers.tower);

module.exports = router;