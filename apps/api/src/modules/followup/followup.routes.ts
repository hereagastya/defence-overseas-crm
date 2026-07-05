import { Router, type Router as ExpressRouter } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/rbac.middleware';
import * as followupController from './followup.controller';

const router: ExpressRouter = Router();

router.use(authenticate);

router.get('/', followupController.listFollowups);
router.post('/', followupController.createFollowup);
router.get('/:id', followupController.getFollowup);
router.patch('/:id', followupController.updateFollowup);
router.delete('/:id', requireAdmin, followupController.deleteFollowup);
router.patch('/:id/complete', followupController.completeFollowup);

export default router;
