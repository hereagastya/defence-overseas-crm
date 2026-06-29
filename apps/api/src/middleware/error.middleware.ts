import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';

/**
 * Central Express error handler — MUST be mounted last in app.ts.
 * Catches every error thrown or passed via next(err) in the request pipeline.
 *
 * - ZodError (validation): returns 400 VALIDATION_ERROR with field-level details.
 * - AppError (operational): returns typed error envelope; logs at warn/error level.
 * - Unknown error: logs full stack, returns generic 500 (no internals exposed to client).
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  // Synchronous console fallback so errors are always visible in development
  // even when the pino-pretty worker thread drops output.
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.error('[error-handler]', err);
  }

  if (err instanceof ZodError) {
    const details = err.errors.reduce<Record<string, string[]>>((acc, issue) => {
      const key = issue.path.length > 0 ? issue.path.join('.') : '_root';
      acc[key] = [...(acc[key] ?? []), issue.message];
      return acc;
    }, {});

    logger.warn({ err, requestId: req.requestId, path: req.path }, 'Request validation failed');

    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details },
    });
    return;
  }

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err, requestId: req.requestId, path: req.path }, err.message);
    } else {
      logger.warn({ err, requestId: req.requestId, path: req.path }, err.message);
    }

    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.errorCode,
        message: err.message,
        ...(err.details && { details: err.details }),
      },
    });
    return;
  }

  // Unknown / programmer error — log everything, expose nothing
  logger.error({ err, requestId: req.requestId, path: req.path }, 'Unhandled error');

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred. Please try again later.',
    },
  });
};
