import { Router, type Router as ExpressRouter } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/rbac.middleware';
import * as leadController from './lead.controller';

const router: ExpressRouter = Router();

// All lead routes require authentication
router.use(authenticate);

// ── Collection ───────────────────────────────────────────────────────────────
router.get('/', leadController.listLeads);
router.post('/', leadController.createLead);

// ── Member — core CRUD ────────────────────────────────────────────────────────
router.get('/:id', leadController.getLead);
router.patch('/:id', leadController.updateLead);
router.delete('/:id', requireAdmin, leadController.deleteLead);

// ── Member — actions ─────────────────────────────────────────────────────────
// stage: counselor-accessible (service enforces per-lead ownership)
router.patch('/:id/stage', leadController.updateLeadStage);
// assign: counselor-accessible (service checks visibility + ownership)
router.patch('/:id/assign', leadController.assignLead);
// convert: counselor-accessible (service enforces ownership)
router.post('/:id/convert', leadController.convertLead);

// ── Member — sub-resources ────────────────────────────────────────────────────
router.get('/:id/notes', leadController.getLeadNotes);
router.post('/:id/notes', leadController.addLeadNote);
// activity log is admin-only (service enforces via assertCan)
router.get('/:id/activity', leadController.getLeadActivity);

export default router;
