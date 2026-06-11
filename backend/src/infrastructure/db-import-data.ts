import path from 'node:path';
import { access } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { loadConfig } from './config.js';
import { createLogger } from './logger.js';

const logger = createLogger();
const config = loadConfig();

function parseArg(flag: string) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

async function ensureFileExists(filePath: string) {
  await access(filePath);
}

function resolveCliPath(filePath: string) {
  return path.isAbsolute(filePath)
    ? filePath
    : path.resolve(process.cwd(), '..', filePath);
}

async function runPsql(inputPath: string) {
  const executable = process.env.PSQL_BIN || 'psql';
  const args = [
    '--set',
    'ON_ERROR_STOP=1',
    '--single-transaction',
    `--dbname=${config.databaseUrl}`,
    `--file=${inputPath}`
  ];

  logger.info(`Importing database data from ${inputPath}`);

  await new Promise<void>((resolve, reject) => {
    const child = spawn(executable, args, { stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`psql exited with code ${code ?? 'unknown'}`));
    });
  });
}

const inputArg = parseArg('--input');
if (!inputArg) {
  throw new Error('Expected --input <path-to-sql-dump>.');
}

const inputPath = resolveCliPath(inputArg);
await ensureFileExists(inputPath);
await runPsql(inputPath);
logger.info(`Database data import complete: ${inputPath}`);
