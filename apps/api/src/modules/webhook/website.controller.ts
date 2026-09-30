import type { RequestHandler } from 'express';
import { logger } from '../../utils/logger';
import { AppError } from '../../utils/AppError';
import { verifyWebsiteToken, processWebsiteWebhook } from './website.service';

/**
 * POST /api/v1/webhooks/website
 *
 * Receives contact-form submissions from the Defence Overseas website.
 * Security: Bearer token checked against WEBSITE_WEBHOOK_SECRET env var.
 * Responds 200 synchronously — processing is fast (single DB insert).
 * Returns duplicate: true when the phone already exists, so the website
 * caller does not retry in a loop.
 */
export const receiveWebsiteForm: RequestHandler = async (req, res) => {
  const authHeader = req.headers['authorization'];

  if (!verifyWebsiteToken(typeof authHeader === 'string' ? authHeader : undefined)) {
    logger.warn(
      { hasAuthHeader: Boolean(authHeader) },
      'website-webhook: missing or invalid Bearer token',
    );
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const result = await processWebsiteWebhook(req.body);
    res.status(200).json({ received: true, ...(result.duplicate ? { duplicate: true } : {}) });
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    logger.error({ err }, 'website-webhook: unhandled error');
    res.status(500).json({ error: 'Internal server error' });
  }
};
