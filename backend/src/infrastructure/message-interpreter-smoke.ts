import { loadConfig } from './config.js';
import { createLogger } from './logger.js';
import { createMessageInterpreter } from './message-interpreter.provider.js';
import type { Category, User } from '../domain/index.js';

const config = loadConfig();
const logger = createLogger();
const interpreter = createMessageInterpreter(config, logger);
const args = process.argv.slice(2);
const allowSmoke = args.includes('--allow-smoke');
const message = args.filter((arg) => arg !== '--allow-smoke').join(' ').trim();

const user: User = {
  id: 'smoke-user',
  tenantId: 'smoke-tenant',
  phoneNumber: '+56900000000',
  firstName: 'Smoke',
  lastName: 'User',
  preferredName: 'Smoke',
  role: 'consumer',
  countryOfResidence: 'Chile',
  preferredCurrency: 'CLP',
  reportPreferences: ['monthly']
};

const categories: Category[] = [
  { id: 'food', tenantId: user.tenantId, name: 'Food', isDefault: true },
  { id: 'groceries', tenantId: user.tenantId, name: 'Groceries', parentId: 'food', isDefault: true },
  { id: 'transport', tenantId: user.tenantId, name: 'Transport', isDefault: true },
  { id: 'income', tenantId: user.tenantId, name: 'Income', isDefault: true }
];

async function main() {
  if (!allowSmoke) {
    throw new Error('Interpreter smoke tests are manual-only. Re-run with --allow-smoke to confirm this should execute locally.');
  }

  if (!message) {
    throw new Error('Missing message. Usage: pnpm --filter @expenses-tracker/backend interpreter:smoke --allow-smoke "20.000 clases de bachata, transferencia bci"');
  }

  const result = await interpreter.interpret(message, {
    user,
    categories,
    now: new Date()
  });

  console.log(JSON.stringify({
    provider: config.messageInterpreterProvider,
    model: config.messageInterpreterModel,
    message,
    result
  }, null, 2));
}

main().catch((error) => {
  logger.error('Message interpreter smoke test failed.', {
    error: error instanceof Error ? error.message : String(error)
  });
  process.exitCode = 1;
});
