import { Router, type Router as ExpressRouter } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import * as studentController from './student.controller';

const router: ExpressRouter = Router();

router.use(authenticate);

// ── Collection ────────────────────────────────────────────────────────────────
router.get('/', studentController.listStudents);

// ── Member — core ─────────────────────────────────────────────────────────────
router.get('/:id', studentController.getStudent);
router.patch('/:id', studentController.updateStudent);

// ── Member — actions ──────────────────────────────────────────────────────────
router.patch('/:id/stage', studentController.updateStudentStage);
router.patch('/:id/assign', studentController.assignStudent);

// ── Member — sub-resources ────────────────────────────────────────────────────
router.get('/:id/notes', studentController.getStudentNotes);
router.post('/:id/notes', studentController.addStudentNote);
// activity log requires ACTIVITY_LOGS_READ permission (admin-only via RolePermissions)
router.get('/:id/activity', studentController.getStudentActivity);
// timeline combines lead + student activity; visible to all authenticated users with STUDENTS_READ
router.get('/:id/timeline', studentController.getStudentTimeline);

export default router;
