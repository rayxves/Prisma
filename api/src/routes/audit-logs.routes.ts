import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminMiddleware } from '../middlewares/admin.middleware';
import * as AuditLogsController from '../controllers/audit-logs.controller';

const router = Router();

router.use(authMiddleware);

router.get('/', adminMiddleware, AuditLogsController.list);

export default router;
