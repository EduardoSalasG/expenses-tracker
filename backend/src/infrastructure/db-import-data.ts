import path from 'node:path';
import { access, readFile } from 'node:fs/promises';
import { loadConfig } from './config.js';
import { createPool } from './database.js';
import { createLogger } from './logger.js';

const logger = createLogger();
const config = loadConfig();

function parseArg(flag: string) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function resolveCliPath(filePath: string) {
  return path.isAbsolute(filePath)
    ? filePath
    : path.resolve(process.cwd(), '..', filePath);
}

async function ensureFileExists(filePath: string) {
  await access(filePath);
}

async function runSqlImport(inputPath: string) {
  const pool = createPool(config);
  try {
    const sql = await readFile(inputPath, 'utf8');
    logger.info(`Importing database data from ${inputPath}`);
    await pool.query(sql);
    logger.info(`Database data import complete: ${inputPath}`);
  } finally {
    await pool.end();
  }
}

const inputArg = parseArg('--input');
if (!inputArg) {
  throw new Error('Expected --input <path-to-sql-dump>.');
}

const inputPath = resolveCliPath(inputArg);
await ensureFileExists(inputPath);
await runSqlImport(inputPath);
