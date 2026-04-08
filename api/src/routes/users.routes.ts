import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminMiddleware } from '../middlewares/admin.middleware';
import * as UsersController from '../controllers/users.controller';

const router = Router();

router.use(authMiddleware);

router.get('/',               adminMiddleware, UsersController.list);
router.post('/',              adminMiddleware, UsersController.create);
router.get('/:id',            adminMiddleware, UsersController.getById);
router.put('/:id',            adminMiddleware, UsersController.update);
router.delete('/:id',         adminMiddleware, UsersController.remove);
router.patch('/:id/password', UsersController.updatePassword);

export default router;
