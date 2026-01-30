var express = require('express');
var router = express.Router();

var supportControllers = require('@/controllers/supportControllers.js');

router.get('/', supportControllers.supportUnset);
router.get('/new', supportControllers.supportNew);
router.get('/requests', supportControllers.supportRequests);
router.get('/requests/:id', supportControllers.supportRequest);

module.exports = router;