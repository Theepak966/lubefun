var express = require('express');
var router = express.Router();

var casinoControllers = require('@/controllers/casinoControllers.js');

router.get('/', casinoControllers.casinoUnset);
router.get('/lobby', casinoControllers.casinoLobby);
router.get('/slots', casinoControllers.casinoSlots);
router.get('/live', casinoControllers.casinoLive);
router.get('/favorites', casinoControllers.casinoFavorites);

router.get('/slots/:gameid', casinoControllers.casinoGame);
router.get('/slots/:gameid/demo', casinoControllers.casinoGame);

module.exports = router;