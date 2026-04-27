import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import * as MetricsController from '../controllers/metrics.controller';

const router = Router();

router.use(authMiddleware);

router.get('/daily', MetricsController.daily);

export default router;
