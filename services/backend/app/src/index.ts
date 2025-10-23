import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';

dotenv.config();

export const createApp = () => {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/healthz', (_req, res) => {
    res.json({ status: 'ok' });
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
}

export default app;
