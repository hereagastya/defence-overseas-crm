import { env } from './config/env';
import { logger } from './utils/logger';
import { createApp } from './app';
import { markOverdueFollowups } from './jobs/markOverdueFollowups';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(
    { port: env.PORT, nodeEnv: env.NODE_ENV },
    `[api] Server running on port ${env.PORT} in ${env.NODE_ENV} mode`,
  );
  logger.info(`[api] Health check: http://localhost:${env.PORT}/health`);

  // Mark overdue follow-ups on startup and every 5 minutes thereafter
  markOverdueFollowups();
  setInterval(markOverdueFollowups, 5 * 60 * 1000);
});

process.on('SIGTERM', () => {
  logger.info('[api] SIGTERM received — shutting down gracefully');
  server.close(() => {
    logger.info('[api] Server closed');
    process.exit(0);
  });
});

export default app;
