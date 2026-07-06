import { Router, type Router as ExpressRouter } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/rbac.middleware';
import * as taskController from './task.controller';

const router: ExpressRouter = Router();

router.use(authenticate);

router.get('/', taskController.listTasks);
router.post('/', taskController.createTask);
router.get('/:id', taskController.getTask);
router.patch('/:id', taskController.updateTask);
router.delete('/:id', requireAdmin, taskController.deleteTask);
router.patch('/:id/complete', taskController.completeTask);
router.patch('/:id/reopen', taskController.reopenTask);

export default router;
