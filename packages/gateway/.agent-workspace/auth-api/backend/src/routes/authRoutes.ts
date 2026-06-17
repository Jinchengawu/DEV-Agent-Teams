import { Router } from 'express';
import { authController } from '../controllers/authController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// 公开路由
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh-token', authController.refreshToken);

// 需要认证的路由
router.get('/me', authMiddleware.authenticate, authController.getCurrentUser);

export default router;
