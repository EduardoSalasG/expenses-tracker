import { loadConfig } from './config.js';
import { createLogger } from './logger.js';
import { createMessageInterpreter } from './message-interpreter.provider.js';
import type { Category, User } from '../domain/index.js';

const config = loadConfig();
const logger = createLogger();
const interpreter = createMessageInterpreter(config, logger);
const message = process.argv.slice(2).join(' ').trim();

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
  if (!message) {
    throw new Error('Missing message. Usage: pnpm --filter @expenses-tracker/backend interpreter:smoke "20.000 clases de bachata, transferencia bci"');
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
  logger.error('Message interpreter smoke test failed.', { error });
  process.exitCode = 1;
});
