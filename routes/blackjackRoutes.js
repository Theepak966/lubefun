/**
 * Blackjack routes.
 *
 * Why:
 * - Mirrors the existing pattern used by other original games.
 */
var express = require('express');
var router = express.Router();

var blackjackControllers = require('@/controllers/blackjackControllers.js');

router.get('/', blackjackControllers.blackjack);

module.exports = router;

