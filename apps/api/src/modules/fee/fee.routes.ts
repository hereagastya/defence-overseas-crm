import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/rbac.middleware';
import * as feeController from './fee.controller';

// mergeParams exposes :studentId from the parent router (/students/:studentId/fees)
const router: ExpressRouter = Router({ mergeParams: true });

router.use(authenticate);

router.get('/', feeController.listFees);
router.post('/', feeController.assignFee);
router.get('/:feeId', feeController.getFee);
// Update and delete are admin-only (FEES_UPDATE, FEES_DELETE not in counselor permissions)
router.patch('/:feeId', requireAdmin, feeController.updateFee);
router.delete('/:feeId', requireAdmin, feeController.deleteFee);

export default router;
