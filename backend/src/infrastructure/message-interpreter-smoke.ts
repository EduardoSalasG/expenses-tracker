import { loadConfig } from './config.js';
import { createLogger } from './logger.js';
import { createMessageInterpreter } from './message-interpreter.provider.js';
import type { Category, User } from '../domain/index.js';
import type { BankOption, PaymentMethodOption } from '../domain/finance/types.js';

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
  { id: 'public-transport', tenantId: user.tenantId, name: 'Public Transport', parentId: 'transport', isDefault: true },
  { id: 'education', tenantId: user.tenantId, name: 'Education', isDefault: true },
  { id: 'dance', tenantId: user.tenantId, name: 'Dance', parentId: 'education', isDefault: true },
  { id: 'clothing', tenantId: user.tenantId, name: 'Clothing', isDefault: true },
  { id: 'clothes', tenantId: user.tenantId, name: 'Clothes', parentId: 'clothing', isDefault: true }
];

const banks: BankOption[] = [
  { id: 'bci', tenantId: user.tenantId, name: 'Banco de Crédito e Inversiones', isDefault: true },
  { id: 'chile', tenantId: user.tenantId, name: 'Banco de Chile', isDefault: true }
];

const paymentMethodOptions: PaymentMethodOption[] = [
  { id: 'transfer', tenantId: user.tenantId, code: 'transfer', name: 'Transferencia', kind: 'transfer', isDefault: true },
  { id: 'credit-card', tenantId: user.tenantId, code: 'credit_card', name: 'Tarjeta de Crédito', kind: 'card', cardType: 'credit', isDefault: true },
  { id: 'debit-card', tenantId: user.tenantId, code: 'debit_card', name: 'Tarjeta de débito', kind: 'card', cardType: 'debit', isDefault: true },
  { id: 'cash', tenantId: user.tenantId, code: 'cash', name: 'Efectivo', kind: 'cash', isDefault: true }
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
    banks,
    paymentMethodOptions,
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
