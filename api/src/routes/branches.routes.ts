import { Router } from 'express';

import { authMiddleware } from '../middlewares/auth.middleware';
import { adminMiddleware } from '../middlewares/admin.middleware';
import { validate } from '../shared/middlewares/validate.middleware';
import { createBranchSchema, updateBranchSchema } from '../schemas/branch.schema';
import * as BranchesController from '../controllers/branches.controller';

const router = Router();

router.use(authMiddleware);

router.get('/',       BranchesController.list);
router.post('/',      adminMiddleware, validate(createBranchSchema), BranchesController.create);
router.get('/:id',    BranchesController.getById);
router.put('/:id',    adminMiddleware, validate(updateBranchSchema), BranchesController.update);
router.delete('/:id', adminMiddleware, BranchesController.remove);

export default router;
