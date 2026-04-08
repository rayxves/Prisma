import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminMiddleware } from '../middlewares/admin.middleware';
import * as AuditLogsController from '../controllers/audit-logs.controller';

const router = Router();

router.use(authMiddleware);

// ?userId=&from=YYYY-MM-DD&to=YYYY-MM-DD&page=1&limit=50
router.get('/', adminMiddleware, AuditLogsController.list);

export default router;
