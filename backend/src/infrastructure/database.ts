import pg from 'pg';
import type { AppConfig } from './config.js';

export function createPool(config: AppConfig) {
  return new pg.Pool({
    connectionString: config.databaseUrl,
    max: 10,
    idleTimeoutMillis: 30_000
  });
}

export type DatabasePool = pg.Pool;

export async function pingDatabase(pool: DatabasePool) {
  await pool.query('select 1');
}
