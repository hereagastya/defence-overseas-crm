import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/rbac.middleware';
import * as applicationController from './application.controller';

// mergeParams exposes :studentId from the parent router (/students/:studentId/applications)
const router: ExpressRouter = Router({ mergeParams: true });

router.use(authenticate);

router.get('/', applicationController.listApplications);
router.post('/', applicationController.createApplication);
router.get('/:id', applicationController.getApplication);
router.patch('/:id', applicationController.updateApplication);
// Delete is admin-only (APPLICATIONS_DELETE is not in counselor RolePermissions)
router.delete('/:id', requireAdmin, applicationController.deleteApplication);

export default router;
