import { randomUUID } from 'crypto';
import type { RequestHandler } from 'express';
import { logger } from '../utils/logger';

export const requestLogger: RequestHandler = (req, res, next) => {
  req.requestId = randomUUID();
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

    logger[level]({
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: duration,
      userId: req.user?.id,
    });
  });

  next();
};
