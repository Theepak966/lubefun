var express = require('express');
var router = express.Router();

var authorizeControllers = require('@/controllers/authorizeControllers.js');

router.get('/account', authorizeControllers.authorizeAccount);
router.get('/admin', authorizeControllers.authorizeAdmin);

module.exports = router;