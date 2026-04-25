import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import * as ReportsController from '../controllers/reports.controller';

const router = Router();

router.use(authMiddleware);

router.get('/pdf',   ReportsController.pdf);
router.get('/excel', ReportsController.excel);

export default router;
