import { Router } from 'express';

import { authMiddleware } from '../middlewares/auth.middleware';
import { adminMiddleware } from '../middlewares/admin.middleware';
import { validate } from '../shared/middlewares/validate.middleware';
import { updateTenantSchema } from '../schemas/tenant.schema';
import * as TenantController from '../controllers/tenant.controller';

const router = Router();

router.use(authMiddleware);

router.get('/', TenantController.get);
router.put('/', adminMiddleware, validate(updateTenantSchema), TenantController.update);

export default router;
