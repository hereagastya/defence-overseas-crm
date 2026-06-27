import 'dotenv/config';
import { createApp } from './app';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

const app = createApp();

const server = app.listen(PORT, () => {
  console.log(`[api] Server running on port ${PORT} in ${NODE_ENV} mode`);
  console.log(`[api] Health check: http://localhost:${PORT}/health`);
});

process.on('SIGTERM', () => {
  console.log('[api] SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('[api] Server closed.');
    process.exit(0);
  });
});

export default app;
