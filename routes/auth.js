var express = require('express');
var router = express.Router();

router.use('/login', require('@/routes/loginRoutes.js'));
router.use('/register', require('@/routes/registerRoutes.js'));
router.use('/twofa', require('@/routes/twofaRoutes.js'));
router.use('/authorize', require('@/routes/authorizeRoutes.js'));

module.exports = router;