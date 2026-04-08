import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import * as ReportsController from '../controllers/reports.controller';

const router = Router();

router.use(authMiddleware);

// ?branchId=&from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/pdf',   ReportsController.pdf);
router.get('/excel', ReportsController.excel);

export default router;
