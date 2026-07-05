import { Router, type Router as ExpressRouter } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import * as reportController from './report.controller';

const router: ExpressRouter = Router();

router.use(authenticate);

router.get('/leads', reportController.getLeadsReport);
router.get('/revenue', reportController.getRevenueReport);
router.get('/counselor-performance', reportController.getCounselorPerformance);
router.get('/student-progress', reportController.getStudentProgress);
router.get('/applications', reportController.getApplicationsReport);
router.get('/country-distribution', reportController.getCountryDistribution);
router.get('/tasks', reportController.getTasksReport);
router.get('/follow-ups', reportController.getFollowUpsReport);

export default router;
