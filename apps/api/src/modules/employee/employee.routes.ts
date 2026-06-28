import { Router, type Router as ExpressRouter } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin, requireCounselor } from '../../middleware/rbac.middleware';
import * as employeeController from './employee.controller';

const router: ExpressRouter = Router();

// All employee routes require authentication
router.use(authenticate);

// Read — Admins and Counselors
router.get('/', requireCounselor, employeeController.listEmployees);
router.get('/:id', requireCounselor, employeeController.getEmployee);

// Mutations — Admin only
router.post('/', requireAdmin, employeeController.createEmployee);
router.patch('/:id', requireAdmin, employeeController.updateEmployee);
router.delete('/:id', requireAdmin, employeeController.deactivateEmployee);
router.post('/:id/reset-password', requireAdmin, employeeController.resetPassword);

export default router;
