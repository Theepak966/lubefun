var express = require('express');
var router = express.Router();

var rewardsControllers = require('@/controllers/rewardsControllers.js');

router.get('/', rewardsControllers.rewards);

module.exports = router;