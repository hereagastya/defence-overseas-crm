import { Router, type Router as ExpressRouter } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { authRateLimit } from '../../middleware/rateLimit.middleware';
import * as authController from './auth.controller';

const router: ExpressRouter = Router();

router.post('/login', authRateLimit, authController.login);
router.post('/logout', authenticate, authController.logout);
router.get('/session', authenticate, authController.getSession);
router.post('/change-password', authenticate, authRateLimit, authController.changePassword);

export default router;
