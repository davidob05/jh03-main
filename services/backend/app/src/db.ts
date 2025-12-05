import { Pool } from 'pg';

export type DbHealth =
  | { status: 'ok' }
  | { status: 'error'; error: string }
  | { status: 'skipped'; reason: string };

let pool: Pool | undefined;

const createPool = () => {
  if (!process.env.DATABASE_URL) {
    return undefined;
  }

  const connection = new Pool({ connectionString: process.env.DATABASE_URL });

  connection.on('error', (err) => {
    console.error('[backend] database pool error', err);
  });

  return connection;
};

export const getPool = (): Pool | undefined => {
  if (!pool) {
    pool = createPool();
  }

  return pool;
};

export const checkDatabase = async (): Promise<DbHealth> => {
  const connection = getPool();

  if (!connection) {
    return { status: 'skipped', reason: 'DATABASE_URL not configured' };
  }

  try {
    await connection.query('SELECT 1');
    return { status: 'ok' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { status: 'error', error: message };
  }
};

export const shutdownDatabase = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
};
