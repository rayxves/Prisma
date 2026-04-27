import { Router } from 'express';

import { authMiddleware } from '../middlewares/auth.middleware';
import { adminMiddleware } from '../middlewares/admin.middleware';
import { validate } from '../shared/middlewares/validate.middleware';
import { createUserSchema, updateUserSchema, changePasswordSchema } from '../schemas/user.schema';
import * as UsersController from '../controllers/users.controller';

const router = Router();

router.use(authMiddleware);

router.get('/',               adminMiddleware, UsersController.list);
router.post('/',              adminMiddleware, validate(createUserSchema),   UsersController.create);
router.get('/:id',            adminMiddleware, UsersController.getById);
router.put('/:id',            adminMiddleware, validate(updateUserSchema),   UsersController.update);
router.delete('/:id',         adminMiddleware, UsersController.remove);
router.patch('/:id/password', validate(changePasswordSchema), UsersController.updatePassword);

export default router;
