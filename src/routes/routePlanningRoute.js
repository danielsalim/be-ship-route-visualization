import express from 'express';
import generateRoute from '../controllers/routePlanningController.js';

const router = express.Router();

router.post('/route', generateRoute);

export default router;