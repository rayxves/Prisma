import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import * as AnomaliesController from '../controllers/anomalies.controller';

const router = Router();

router.use(authMiddleware);

// ?branchId=&from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/',    AnomaliesController.list);
router.get('/:id', AnomaliesController.getById);

export default router;
