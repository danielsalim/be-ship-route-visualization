const express = require('express');
const { generateRoute } = require('../controllers/routePlanningController');
const router = express.Router();

router.post('/route', generateRoute);

module.exports = router;
