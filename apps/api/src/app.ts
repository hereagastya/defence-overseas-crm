import cors from 'cors';
import express, { type Application } from 'express';

export function createApp(): Application {
  const app = express();

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'defence-overseas-crm-api',
      timestamp: new Date().toISOString(),
    });
  });

  return app;
}
