var express = require('express');
var router = express.Router();

var faqControllers = require('@/controllers/faqControllers.js');

router.get('/', faqControllers.faq);

module.exports = router;