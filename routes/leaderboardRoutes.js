var express = require('express');
var router = express.Router();

var leaderboardControllers = require('@/controllers/leaderboardControllers.js');

router.get('/', leaderboardControllers.leaderboard);

module.exports = router;