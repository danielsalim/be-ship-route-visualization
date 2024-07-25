import express from 'express';
import getS57LayersController from '../controllers/s57LayersController.js';

const router = express.Router();

router.get('/s57-layers', getS57LayersController);

export default router;