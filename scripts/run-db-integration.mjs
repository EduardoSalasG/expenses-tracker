import { spawnSync } from 'node:child_process';

const command = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const dbName = 'expenses_tracker_integration';
const docker = (args) => spawnSync(process.platform === 'win32' ? 'docker.exe' : 'docker', ['compose', 'exec', '-T', 'database', ...args], { stdio: 'inherit' });
docker(['psql', '-U', 'expenses', '-d', 'postgres', '-c', `drop database if exists ${dbName} with (force);`]);
docker(['psql', '-U', 'expenses', '-d', 'postgres', '-c', `create database ${dbName};`]);
const bootstrap = spawnSync(command, ['--filter', '@expenses-tracker/backend', 'db:bootstrap'], {
  env: { ...process.env, DATABASE_URL: `postgres://expenses:expenses@localhost:6543/${dbName}` },
  stdio: 'inherit', shell: process.platform === 'win32'
});
if (bootstrap.status !== 0) {
  docker(['psql', '-U', 'expenses', '-d', 'postgres', '-c', `drop database if exists ${dbName} with (force);`]);
  process.exitCode = bootstrap.status ?? 1;
  process.exit();
}
const result = spawnSync(command, ['--filter', '@expenses-tracker/backend', 'test', '--', 'src/infrastructure/repositories/postgres.integration.test.ts', 'src/application/process-inbound-finance-message.postgres.integration.test.ts'], {
  env: { ...process.env, DATABASE_URL: `postgres://expenses:expenses@localhost:6543/${dbName}`, RUN_DB_INTEGRATION_TESTS: 'true' },
  stdio: 'inherit',
  shell: process.platform === 'win32'
});
docker(['psql', '-U', 'expenses', '-d', 'postgres', '-c', `drop database if exists ${dbName} with (force);`]);
process.exitCode = result.status ?? 1;
