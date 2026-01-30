var express = require('express');
var router = express.Router();

var minesweeperControllers = require('@/controllers/minesweeperControllers.js');

router.get('/', minesweeperControllers.minesweeper);

module.exports = router;