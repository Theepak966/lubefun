var express = require('express');
var router = express.Router();

var drakonControllers = require('@/controllers/api/drakon.js');

router.post('/drakon_api', drakonControllers.webhook);

module.exports = router;