import type { RequestHandler } from 'express';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';
import { verifyMetaSignature, processWebhookPayload } from './meta.service';
import type { MetaWebhookPayload } from './meta.service';

/**
 * GET /api/v1/webhooks/meta
 *
 * Meta calls this once when you register the webhook URL in the App Dashboard.
 * It sends hub.mode, hub.verify_token, and hub.challenge as query params.
 * We verify the token and echo back the challenge to complete registration.
 */
export const verifyWebhook: RequestHandler = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === env.META_VERIFY_TOKEN) {
    logger.info('meta-webhook: verification handshake successful');
    res.status(200).send(String(challenge));
    return;
  }

  logger.warn(
    { mode, tokenMatch: token === env.META_VERIFY_TOKEN },
    'meta-webhook: verification handshake failed — wrong mode or verify_token',
  );
  res.status(403).json({ error: 'Webhook verification failed' });
};

/**
 * POST /api/v1/webhooks/meta
 *
 * Receives lead-gen notifications from Meta. Each notification may contain
 * multiple entries and leadgen_ids. Processing is fire-and-forget: we verify
 * the HMAC signature synchronously, acknowledge with 200 immediately, then
 * process each lead asynchronously so Meta's timeout is never a concern.
 */
export const receiveLeads: RequestHandler = (req, res) => {
  const rawBody = req.rawBody;
  const signatureHeader = req.headers['x-hub-signature-256'];
  const signature = typeof signatureHeader === 'string' ? signatureHeader : undefined;

  if (!rawBody) {
    // Should not happen in normal operation — indicates misconfigured express.json verify
    logger.error(
      'meta-webhook: req.rawBody is undefined — check express.json verify callback in app.ts',
    );
    res.status(500).json({ error: 'Server configuration error' });
    return;
  }

  if (!verifyMetaSignature(rawBody, signature)) {
    logger.warn(
      { hasSignatureHeader: Boolean(signatureHeader) },
      'meta-webhook: HMAC signature invalid — request rejected',
    );
    res.status(403).json({ error: 'Invalid signature' });
    return;
  }

  // Acknowledge receipt immediately — Meta expects 200 within 20 seconds
  res.status(200).json({ received: true });

  // Process leads after the response is sent — Graph API calls happen here
  processWebhookPayload(req.body as MetaWebhookPayload).catch((err) => {
    logger.error({ err }, 'meta-webhook: unhandled error during payload processing');
  });
};
