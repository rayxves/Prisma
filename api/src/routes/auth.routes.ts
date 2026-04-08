import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import * as AuthController from '../controllers/auth.controller';

const router = Router();

router.post('/register', AuthController.register);  // Público
router.post('/login',    AuthController.login);     // Público
router.post('/logout',   authMiddleware, AuthController.logout);
router.get('/me',        authMiddleware, AuthController.me);

export default router;
