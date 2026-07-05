import { Router, type Router as ExpressRouter } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import * as dashboardController from './dashboard.controller';

const router: ExpressRouter = Router();

router.use(authenticate);

router.get('/', dashboardController.getSummary);
router.get('/kpis', dashboardController.getKPIs);
router.get('/charts', dashboardController.getCharts);
router.get('/upcoming-follow-ups', dashboardController.getUpcomingFollowups);
router.get('/recent-activity', dashboardController.getRecentActivity);

export default router;
