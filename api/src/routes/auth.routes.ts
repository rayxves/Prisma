import { Router } from 'express';

import { authMiddleware } from '../middlewares/auth.middleware';
import { authRateLimit } from '../shared/middlewares/rate-limit.middleware';
import { validate } from '../shared/middlewares/validate.middleware';
import { registerSchema, loginSchema } from '../schemas/auth.schema';
import * as AuthController from '../controllers/auth.controller';

const router = Router();

router.post('/register', authRateLimit, validate(registerSchema), AuthController.register);
router.post('/login',    authRateLimit, validate(loginSchema),    AuthController.login);
router.post('/logout',   authMiddleware, AuthController.logout);
router.get('/me',        authMiddleware, AuthController.me);

export default router;
