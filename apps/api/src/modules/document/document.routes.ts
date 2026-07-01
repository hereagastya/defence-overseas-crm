import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/rbac.middleware';
import { uploadDocumentMiddleware } from '../../middleware/upload.middleware';
import * as documentController from './document.controller';

// mergeParams exposes :studentId from the parent router (/students/:studentId/documents)
const router: ExpressRouter = Router({ mergeParams: true });

router.use(authenticate);

// List and upload — both counselors and admins
router.get('/', documentController.listDocuments);
router.post('/', uploadDocumentMiddleware, documentController.uploadDocument);

// Download (signed URL) — admin only per security constraints
router.get('/:id/download', requireAdmin, documentController.downloadDocument);

// Delete (soft) — admin only
router.delete('/:id', requireAdmin, documentController.deleteDocument);

export default router;
