import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import * as DashboardController from '../controllers/dashboard.controller';

const router = Router();

router.use(authMiddleware);

router.get('/kpis',             DashboardController.kpis);
router.get('/sales-timeline',   DashboardController.salesTimeline);
router.get('/top-products',     DashboardController.topProducts);
router.get('/branches-ranking', DashboardController.branchesRanking);
router.get('/projection',       DashboardController.projection);

export default router;
