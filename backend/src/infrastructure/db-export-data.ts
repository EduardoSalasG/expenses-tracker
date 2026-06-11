import { mkdir } from 'node:fs/promises';
import path from 'node:path';
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

function timestamp() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

function resolveCliPath(filePath: string) {
  return path.isAbsolute(filePath)
    ? filePath
    : path.resolve(process.cwd(), '..', filePath);
}

async function runPgDump(outputPath: string) {
  await mkdir(path.dirname(outputPath), { recursive: true });

  const executable = process.env.PG_DUMP_BIN || 'pg_dump';
  const args = [
    '--data-only',
    '--inserts',
    '--column-inserts',
    '--no-owner',
    '--no-privileges',
    '--exclude-table=schema_migrations',
    `--dbname=${config.databaseUrl}`,
    `--file=${outputPath}`
  ];

  logger.info(`Exporting database data to ${outputPath}`);

  await new Promise<void>((resolve, reject) => {
    const child = spawn(executable, args, { stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`pg_dump exited with code ${code ?? 'unknown'}`));
    });
  });
}

const requestedOutput = parseArg('--output');
const defaultOutput = path.resolve(process.cwd(), '..', 'database', 'backups', `expenses-tracker-data-${timestamp()}.sql`);
const outputPath = requestedOutput ? resolveCliPath(requestedOutput) : defaultOutput;

await runPgDump(outputPath);
logger.info(`Database data export complete: ${outputPath}`);
