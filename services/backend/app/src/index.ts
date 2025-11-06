import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';

import { checkDatabase, shutdownDatabase } from './db';

dotenv.config();

export const createApp = () => {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/healthz', async (_req, res) => {
    const database = await checkDatabase();
    const healthy = database.status !== 'error';

    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'ok' : 'error',
      services: { database },
    });
  });

  app.get('/api/ping', (_req, res) => {
    res.json({ message: 'pong' });
  });

  return app;
};

const port = Number(process.env.PORT ?? 4000);
const isTestEnv = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
const app = createApp();

if (!isTestEnv) {
  app.listen(port, '0.0.0.0', () => {
    console.log(`[backend] listening on port ${port}`);
  });

  const gracefulShutdown = async () => {
    console.log('[backend] shutting down');
    await shutdownDatabase();
    process.exit(0);
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
}

export default app;
