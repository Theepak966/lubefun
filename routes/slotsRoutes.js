var express = require('express');
var router = express.Router();

var slotsControllers = require('@/controllers/slotsControllers.js');

router.get('/', slotsControllers.slots);

module.exports = router;
