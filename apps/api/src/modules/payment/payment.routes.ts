import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/rbac.middleware';
import * as paymentController from './payment.controller';

// mergeParams exposes :studentId and :feeId from parent routers
const router: ExpressRouter = Router({ mergeParams: true });

router.use(authenticate);

router.get('/', paymentController.listPayments);
// Record payment — admin only (PAYMENTS_CREATE not in counselor permissions)
router.post('/', requireAdmin, paymentController.recordPayment);
router.patch('/:paymentId', requireAdmin, paymentController.updatePayment);
router.delete('/:paymentId', requireAdmin, paymentController.deletePayment);
// Receipt download — admin only (PAYMENTS_RECEIPT not in counselor permissions)
router.get('/:paymentId/receipt', requireAdmin, paymentController.getReceipt);

export default router;
