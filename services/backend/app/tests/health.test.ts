import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/db', () => ({
  checkDatabase: vi.fn(),
}));

import { checkDatabase } from '../src/db';
import { createApp } from '../src/index';

const mockedCheckDatabase = vi.mocked(checkDatabase);

beforeEach(() => {
  mockedCheckDatabase.mockReset();
  mockedCheckDatabase.mockResolvedValue({ status: 'skipped', reason: 'DATABASE_URL not configured' });
});

describe('API health', () => {
  const app = createApp();

  it('responds on /healthz', async () => {
    const res = await request(app).get('/healthz');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: 'ok',
      services: {
        database: { status: 'skipped', reason: 'DATABASE_URL not configured' },
      },
    });
  });

  it('responds on /api/ping', async () => {
    const res = await request(app).get('/api/ping');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'pong' });
  });

  it('surfaces database errors on /healthz', async () => {
    mockedCheckDatabase.mockResolvedValueOnce({ status: 'error', error: 'boom' });

    const res = await request(app).get('/healthz');

    expect(res.status).toBe(503);
    expect(res.body).toEqual({
      status: 'error',
      services: {
        database: { status: 'error', error: 'boom' },
      },
    });
  });
});
