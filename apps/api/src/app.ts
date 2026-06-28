import cors from 'cors';
import express, { type Application } from 'express';
import { env } from './config/env';
import { requestLogger } from './middleware/requestLogger.middleware';
import { generalRateLimit } from './middleware/rateLimit.middleware';
import { errorHandler } from './middleware/error.middleware';
import { createRouter } from './routes/index';

export function createApp(): Application {
  const app = express();

  // ── Body parsing ────────────────────────────────────────────────────────────
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // ── CORS ────────────────────────────────────────────────────────────────────
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );

  // ── Request logging + request ID ────────────────────────────────────────────
  app.use(requestLogger);

  // ── Rate limiting (general; auth endpoints get a tighter limit in their router)
  app.use(generalRateLimit);

  // ── Health check — no auth required ─────────────────────────────────────────
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'defence-overseas-crm-api',
      timestamp: new Date().toISOString(),
    });
  });

  // ── API routes ───────────────────────────────────────────────────────────────
  app.use('/api/v1', createRouter());

  // ── Centralized error handler — MUST be the very last middleware ─────────────
  app.use(errorHandler);

  return app;
}
