import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import employeeRoutes from '../modules/employee/employee.routes';
import leadRoutes from '../modules/lead/lead.routes';
import studentRoutes from '../modules/student/student.routes';
import applicationRoutes from '../modules/application/application.routes';
import documentRoutes from '../modules/document/document.routes';

/**
 * Root API router mounted at /api/v1.
 *
 * Business module routers added in Milestones 8–9:
 *   router.use('/payments',     paymentRoutes)    // M8
 *   router.use('/tasks',        taskRoutes)       // M9
 *   router.use('/follow-ups',   followUpRoutes)   // M9
 *   router.use('/dashboard',    dashboardRoutes)  // M9
 *   router.use('/reports',      reportRoutes)     // M9
 *   router.use('/notifications',notificationRoutes) // M9
 *   router.use('/settings',     settingsRoutes)   // M9
 *   router.use('/calendar',     calendarRoutes)   // M9
 *   router.use('/webhooks',     webhookRoutes)    // M9
 */
export function createRouter(): Router {
  const router = Router();

  router.use('/auth', authRoutes);
  router.use('/employees', employeeRoutes);
  router.use('/leads', leadRoutes);
  router.use('/students', studentRoutes);
  // Nested under students — mergeParams in sub-routers exposes :studentId
  router.use('/students/:studentId/applications', applicationRoutes);
  router.use('/students/:studentId/documents', documentRoutes);

  return router;
}
