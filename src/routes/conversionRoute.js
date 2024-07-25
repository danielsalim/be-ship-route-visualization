import express from 'express';
import convertYamlFile from '../controllers/conversionController.js';

const router = express.Router();

router.get('/convert', convertYamlFile);

export default router;