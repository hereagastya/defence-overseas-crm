import { Router, type Router as ExpressRouter } from 'express';
import * as metaController from './meta.controller';

const router: ExpressRouter = Router();

// No authenticate middleware — Meta calls these endpoints directly.
// Security is provided by HMAC signature verification on POST requests.

// GET — Meta webhook verification handshake (one-time registration step)
router.get('/', metaController.verifyWebhook);

// POST — incoming lead-gen notifications
router.post('/', metaController.receiveLeads);

export default router;
