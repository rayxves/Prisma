import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import * as MetricsController from '../controllers/metrics.controller';

const router = Router();

router.use(authMiddleware);

// ?branchId=&from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/daily', MetricsController.daily);

export default router;
