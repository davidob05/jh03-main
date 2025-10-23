import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../src/index';

describe('API health', () => {
  const app = createApp();

  it('responds on /healthz', async () => {
    const res = await request(app).get('/healthz');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('responds on /api/ping', async () => {
    const res = await request(app).get('/api/ping');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'pong' });
  });
});
