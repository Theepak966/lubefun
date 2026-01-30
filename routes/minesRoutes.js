var express = require('express');
var router = express.Router();

// Alias route: /mines -> minesweeper page
var minesweeperControllers = require('@/controllers/minesweeperControllers.js');

router.get('/', minesweeperControllers.minesweeper);

module.exports = router;

