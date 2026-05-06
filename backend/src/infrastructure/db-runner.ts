import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { createPool } from './database.js';
import { loadConfig } from './config.js';
import { createLogger } from './logger.js';

const logger = createLogger();

async function runSqlDirectory(directory: string) {
  const config = loadConfig();
  const pool = createPool(config);
  const absoluteDirectory = path.resolve(process.cwd(), '..', directory);
  const files = (await readdir(absoluteDirectory))
    .filter((file) => file.endsWith('.sql'))
    .sort();

  try {
    for (const file of files) {
      const fullPath = path.join(absoluteDirectory, file);
      const sql = await readFile(fullPath, 'utf8');
      logger.info(`Running ${directory}/${file}`);
      await pool.query(sql);
    }
  } finally {
    await pool.end();
  }
}

const command = process.argv[2];

if (command === 'migrate') {
  await runSqlDirectory('database/migrations');
} else if (command === 'seed') {
  await runSqlDirectory('database/seeds');
} else {
  throw new Error('Expected command: migrate or seed.');
}
