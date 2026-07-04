import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { getDues } from './payment.controller';

const router: ExpressRouter = Router();

router.use(authenticate);

// GET /api/v1/payments/dues — returns all students with outstanding fees
router.get('/dues', getDues);

export default router;
