import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminMiddleware } from '../middlewares/admin.middleware';
import * as TenantController from '../controllers/tenant.controller';

const router = Router();

router.use(authMiddleware);

router.get('/', TenantController.get);
router.put('/', adminMiddleware, TenantController.update);

export default router;
