import { Router, type Router as ExpressRouter } from 'express';
import { receiveWebsiteForm } from './website.controller';

const router: ExpressRouter = Router();

// POST /api/v1/webhooks/website
router.post('/', receiveWebsiteForm);

export default router;
