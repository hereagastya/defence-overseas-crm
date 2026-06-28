import rateLimit from 'express-rate-limit';
import { env } from '../config/env';
import {
  AUTH_RATE_LIMIT_MAX,
  AUTH_RATE_LIMIT_WINDOW_MS,
  GENERAL_RATE_LIMIT_WINDOW_MS,
} from '../config/constants';

const rateLimitExceededResponse = (message: string) => ({
  success: false,
  error: {
    code: 'RATE_LIMIT_EXCEEDED',
    message,
  },
});

/**
 * General rate limit: applied to every route.
 * Max requests per minute is driven by the RATE_LIMIT_MAX env variable (default 200).
 */
export const generalRateLimit = rateLimit({
  windowMs: GENERAL_RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json(rateLimitExceededResponse('Too many requests. Please try again later.'));
  },
});

/**
 * Auth rate limit: stricter limit on authentication endpoints to prevent brute force.
 * Fixed at 5 attempts per minute regardless of the RATE_LIMIT_MAX setting.
 */
export const authRateLimit = rateLimit({
  windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
  max: AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res
      .status(429)
      .json(
        rateLimitExceededResponse(
          'Too many authentication attempts. Please try again in 1 minute.',
        ),
      );
  },
});
