const express = require('express');
const router = express.Router();
const { convertYamlFile } = require('../controllers/conversionController');

router.get('/convert', convertYamlFile);

module.exports = router;
