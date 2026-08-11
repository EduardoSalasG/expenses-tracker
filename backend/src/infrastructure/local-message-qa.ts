import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DeterministicMessageInterpreter } from '../application/message-interpreter.js';
import type { MessagingProvider } from '../application/ports/index.js';
import { ProcessInboundFinanceMessageUseCase } from '../application/use-cases/index.js';
import type { InboundTextMessage, MessagingChannel } from '../domain/index.js';
import { loadConfig } from './config.js';
import { createPool } from './database.js';
import { createLogger } from './logger.js';
import { createMessageInterpreter } from './message-interpreter.provider.js';
import {
  PostgresBankOptionRepository,
  PostgresBudgetRepository,
  PostgresCategoryRepository,
  PostgresExpenseRepository,
  PostgresIncomeRepository,
  PostgresMessagingMessageAuditRepository,
  PostgresMessagingPendingDraftRepository,
  PostgresPaymentMethodOptionRepository,
  PostgresUserRepository
} from './repositories/postgres.js';

const config = loadConfig();
const logger = createLogger();
const pool = createPool(config);

const args = process.argv.slice(2);
const options = parseArgs(args);

const users = new PostgresUserRepository(pool);
const categories = new PostgresCategoryRepository(pool);
const expenses = new PostgresExpenseRepository(pool);
const incomes = new PostgresIncomeRepository(pool);
const budgets = new PostgresBudgetRepository(pool);
const banks = new PostgresBankOptionRepository(pool);
const paymentMethods = new PostgresPaymentMethodOptionRepository(pool);
const messageAudits = new PostgresMessagingMessageAuditRepository(pool);
const pendingDrafts = new PostgresMessagingPendingDraftRepository(pool);
const interpreter = options.mode === 'deterministic'
  ? new DeterministicMessageInterpreter()
  : createMessageInterpreter(config, logger);
const clock = { now: () => new Date() };
const currentFilePath = fileURLToPath(import.meta.url);
const reportDirectory = path.resolve(path.dirname(currentFilePath), '..', '..', 'qa-reports');

async function main() {
  const channel = options.channel ?? 'telegram';
  const messaging = new CapturingMessagingProvider();
  const useCase = new ProcessInboundFinanceMessageUseCase(
    users,
    categories,
    expenses,
    incomes,
    budgets,
    banks,
    paymentMethods,
    messageAudits,
    pendingDrafts,
    messaging,
    interpreter,
    clock,
    { frontendPublicOrigin: config.frontendPublicOrigin }
  );
  const requestedMessage = options.message?.trim();
  const qaCases = requestedMessage
    ? [buildAdHocCase(requestedMessage)]
    : defaultQaCases();

  const caseReports: QaCaseReport[] = [];
  for (const [index, qaCase] of qaCases.entries()) {
    messaging.messages.length = 0;
    caseReports.push(await executeQaCase({
      qaCase,
      index,
      channel,
      useCase,
      messaging
    }));
  }

  await mkdir(reportDirectory, { recursive: true });
  const reportTimestamp = formatTimestampForFile(clock.now());
  const reportFile = path.join(reportDirectory, `message-qa-${reportTimestamp}.json`);
  const latestFile = path.join(reportDirectory, 'latest.json');

  const report: QaRunReport = {
    generatedAt: clock.now().toISOString(),
    mode: options.mode,
    channel,
    reportFile,
    totals: {
      total: caseReports.length,
      passed: caseReports.filter((item) => item.passed).length,
      failed: caseReports.filter((item) => !item.passed).length
    },
    cases: caseReports
  };

  const serialized = JSON.stringify(report, null, 2);
  await Promise.all([
    writeFile(reportFile, serialized, 'utf8'),
    writeFile(latestFile, serialized, 'utf8')
  ]);

  console.log(serialized);

  if (report.totals.failed > 0) {
    process.exitCode = 1;
  }
}

async function ensureQaUser(phoneNumber: string, chatId: string, channel: MessagingChannel) {
  let user = await users.findByPhoneNumber(phoneNumber);
  if (!user) {
    user = await users.upsertByPhoneNumber({
      phoneNumber,
      firstName: 'Local',
      lastName: 'QA',
      preferredName: 'Local QA',
      email: 'local-qa@example.com',
      countryOfResidence: 'Chile',
      preferredCurrency: 'CLP',
      preferredLanguage: 'es'
    });
    await categories.ensureDefaults(user.tenantId);
  }

  if (channel === 'telegram' && user.telegramChatId !== chatId) {
    const linked = await users.linkTelegramChatByPhone(phoneNumber, chatId, 'local_qa');
    if (linked) user = linked;
  }

  return user;
}

function buildInboundMessage(input: {
  phoneNumber: string;
  chatId: string;
  channel: MessagingChannel;
  message: string;
}): InboundTextMessage {
  if (input.channel === 'telegram') {
    return {
      providerMessageId: `qa-${randomUUID()}`,
      channel: 'telegram',
      fromPhoneNumber: `tg:${input.chatId}`,
      providerUserId: input.chatId,
      replyTo: input.chatId,
      message: input.message
    };
  }

  return {
    providerMessageId: `qa-${randomUUID()}`,
    channel: 'whatsapp',
    fromPhoneNumber: input.phoneNumber,
    message: input.message
  };
}

function parseArgs(argv: string[]) {
  const options: {
    phoneNumber?: string;
    chatId?: string;
    channel?: MessagingChannel;
    mode: 'configured' | 'deterministic';
    message?: string;
  } = {
    mode: 'configured'
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--phone') {
      options.phoneNumber = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === '--chat-id') {
      options.chatId = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === '--channel') {
      const value = argv[index + 1];
      if (value === 'telegram' || value === 'whatsapp') {
        options.channel = value;
      }
      index += 1;
      continue;
    }
    if (arg === '--mode') {
      options.mode = argv[index + 1] === 'deterministic' ? 'deterministic' : 'configured';
      index += 1;
      continue;
    }
    if (arg === '--message') {
      options.message = argv.slice(index + 1).join(' ').trim();
      break;
    }
  }

  return options;
}

function buildAdHocCase(message: string): QaCaseDefinition {
  return {
    name: 'ad-hoc-message',
    message
  };
}

function defaultQaCases(): QaCaseDefinition[] {
  return [
    {
      name: 'expense-supermarket-transfer-bci',
      message: '20.000 supermercado lider, transferencia desde bci',
      expected: {
        movementType: 'expense',
        status: 'saved',
        amount: 20000,
        concept: 'supermercado lider',
        categoryName: 'Food',
        subcategoryName: 'Groceries',
        paymentMethodKind: 'transfer',
        bankName: 'Banco de Crédito e Inversiones',
        installmentCount: 1
      }
    },
    {
      name: 'expense-clothing-credit-bci-installments',
      message: '25.000 polera paris, tdc bci, 3 cuotas',
      expected: {
        movementType: 'expense',
        status: 'saved',
        amount: 25000,
        concept: 'polera paris',
        categoryName: 'Clothing',
        subcategoryName: 'Clothes',
        paymentMethodKind: 'card',
        cardType: 'credit',
        bankName: 'Banco de Crédito e Inversiones',
        installmentCount: 3
      }
    },
    {
      name: 'income-salary-transfer-bci',
      message: 'Ingreso de sueldo 1200000 bci transferencia',
      expected: {
        movementType: 'income',
        status: 'income_saved',
        amount: 1200000,
        concept: 'sueldo'
      }
    },
    {
      name: 'expense-chocolate-credit-bci',
      message: '5000 chocolate, tdc bci',
      expected: {
        movementType: 'expense',
        status: 'saved',
        amount: 5000,
        concept: 'chocolate',
        categoryName: 'Food',
        subcategoryName: 'Restaurants',
        paymentMethodKind: 'card',
        cardType: 'credit',
        bankName: 'Banco de Crédito e Inversiones',
        installmentCount: 1
      }
    },
    {
      name: 'expense-bip-credit-bancoestado',
      message: '350 bip tdc bancoestado',
      expected: {
        movementType: 'expense',
        status: 'saved',
        amount: 350,
        concept: 'bip',
        categoryName: 'Transport',
        subcategoryName: 'Public Transport',
        paymentMethodKind: 'card',
        cardType: 'credit',
        bankName: 'Banco del Estado de Chile',
        installmentCount: 1
      }
    }
  ];
}

async function executeQaCase(input: {
  qaCase: QaCaseDefinition;
  index: number;
  channel: MessagingChannel;
  useCase: ProcessInboundFinanceMessageUseCase;
  messaging: CapturingMessagingProvider;
}): Promise<QaCaseReport> {
  const phoneNumber = options.phoneNumber ?? randomPhoneNumber(input.index);
  const chatId = options.chatId ?? `qa-local-${input.channel}-${input.index + 1}-${randomUUID().slice(0, 8)}`;
  const user = await ensureQaUser(phoneNumber, chatId, input.channel);
  const inbound = buildInboundMessage({
    phoneNumber,
    chatId,
    channel: input.channel,
    message: input.qaCase.message
  });

  const result = await input.useCase.execute(inbound);
  const tenantCategories = await categories.listByTenant(user.tenantId);
  const recentExpenses = await expenses.listRecent(user.tenantId, 3);
  const recentIncomes = await incomes.listRecent(user.tenantId, 3);
  const activeDraft = await pendingDrafts.findActive(user.tenantId, user.id, new Date(), input.channel);
  const actualMovement = input.qaCase.expected?.movementType === 'income'
    ? summarizeIncome(recentIncomes[0])
    : summarizeExpense(recentExpenses[0], tenantCategories);
  const assertions = compareQaResult({
    expected: input.qaCase.expected,
    status: result.status,
    actualMovement
  });

  return {
    name: input.qaCase.name,
    message: input.qaCase.message,
    expected: input.qaCase.expected,
    passed: assertions.every((item) => item.passed),
    assertions,
    user: {
      id: user.id,
      tenantId: user.tenantId,
      phoneNumber: user.phoneNumber,
      telegramChatId: user.telegramChatId
    },
    inbound,
    result,
    replies: [...input.messaging.messages],
    activeDraft,
    actualMovement,
    recentExpenses,
    recentIncomes
  };
}

function summarizeExpense(
  expense: Awaited<ReturnType<typeof expenses.listRecent>>[number] | undefined,
  tenantCategories: Awaited<ReturnType<typeof categories.listByTenant>>
) {
  if (!expense) return null;

  const category = tenantCategories.find((item) => item.id === expense.categoryId);
  const subcategory = tenantCategories.find((item) => item.id === expense.subcategoryId);

  return {
    movementType: 'expense' as const,
    amount: expense.amount,
    concept: expense.concept,
    currency: expense.currency,
    categoryName: category?.name,
    subcategoryName: subcategory?.name,
    paymentMethodKind: expense.paymentMethod.kind,
    cardType: expense.paymentMethod.cardType,
    bankName: expense.paymentMethod.bank,
    installmentCount: expense.installmentCount
  };
}

function summarizeIncome(income: Awaited<ReturnType<typeof incomes.listRecent>>[number] | undefined) {
  if (!income) return null;

  return {
    movementType: 'income' as const,
    amount: income.amount,
    concept: income.concept,
    currency: income.currency
  };
}

function compareQaResult(input: {
  expected?: QaExpected;
  status: string;
  actualMovement: QaMovementSummary | null;
}): QaAssertion[] {
  if (!input.expected) {
    return [{
      field: 'report-only',
      passed: true,
      expected: undefined,
      actual: undefined
    }];
  }

  const assertions: QaAssertion[] = [
    buildAssertion('status', input.expected.status, input.status),
    buildAssertion('movementType', input.expected.movementType, input.actualMovement?.movementType),
    buildAssertion('amount', input.expected.amount, input.actualMovement?.amount),
    buildAssertion('concept', input.expected.concept, input.actualMovement?.concept),
    buildAssertion('categoryName', input.expected.categoryName, input.actualMovement?.categoryName),
    buildAssertion('subcategoryName', input.expected.subcategoryName, input.actualMovement?.subcategoryName),
    buildAssertion('paymentMethodKind', input.expected.paymentMethodKind, input.actualMovement?.paymentMethodKind),
    buildAssertion('cardType', input.expected.cardType, input.actualMovement?.cardType),
    buildAssertion('bankName', input.expected.bankName, input.actualMovement?.bankName),
    buildAssertion('installmentCount', input.expected.installmentCount, input.actualMovement?.installmentCount)
  ];

  return assertions.filter((item) => item.expected !== undefined);
}

function buildAssertion(field: string, expected: unknown, actual: unknown): QaAssertion {
  return {
    field,
    passed: expected === actual,
    expected,
    actual
  };
}

function randomPhoneNumber(index: number) {
  const suffix = `${Date.now()}${index}`.slice(-9);
  return `+569${suffix}`;
}

function formatTimestampForFile(date: Date) {
  return date
    .toISOString()
    .replace(/[:]/g, '-')
    .replace(/\.\d{3}Z$/, 'Z');
}

class CapturingMessagingProvider implements MessagingProvider {
  readonly messages: Array<{ toPhoneNumber: string; body: string; channel?: MessagingChannel }> = [];

  async sendText(toPhoneNumber: string, body: string, options?: { channel?: MessagingChannel }) {
    this.messages.push({
      toPhoneNumber,
      body,
      channel: options?.channel
    });
    return { ok: true };
  }
}

main()
  .catch((error) => {
    logger.error('Local message QA failed.', {
      error: error instanceof Error ? error.message : String(error)
    });
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });

type QaExpected = {
  movementType: 'expense' | 'income';
  status: string;
  amount?: number;
  concept?: string;
  categoryName?: string;
  subcategoryName?: string;
  paymentMethodKind?: 'cash' | 'transfer' | 'card';
  cardType?: 'credit' | 'debit';
  bankName?: string;
  installmentCount?: number;
};

type QaMovementSummary = {
  movementType: 'expense' | 'income';
  amount?: number;
  concept?: string;
  currency?: string;
  categoryName?: string;
  subcategoryName?: string;
  paymentMethodKind?: 'cash' | 'transfer' | 'card';
  cardType?: 'credit' | 'debit';
  bankName?: string;
  installmentCount?: number;
};

type QaCaseDefinition = {
  name: string;
  message: string;
  expected?: QaExpected;
};

type QaAssertion = {
  field: string;
  passed: boolean;
  expected: unknown;
  actual: unknown;
};

type QaCaseReport = {
  name: string;
  message: string;
  expected?: QaExpected;
  passed: boolean;
  assertions: QaAssertion[];
  user: {
    id: string;
    tenantId: string;
    phoneNumber: string;
    telegramChatId?: string;
  };
  inbound: InboundTextMessage;
  result: Awaited<ReturnType<ProcessInboundFinanceMessageUseCase['execute']>>;
  replies: Array<{ toPhoneNumber: string; body: string; channel?: MessagingChannel }>;
  activeDraft: Awaited<ReturnType<typeof pendingDrafts.findActive>>;
  actualMovement: QaMovementSummary | null;
  recentExpenses: Awaited<ReturnType<typeof expenses.listRecent>>;
  recentIncomes: Awaited<ReturnType<typeof incomes.listRecent>>;
};

type QaRunReport = {
  generatedAt: string;
  mode: 'configured' | 'deterministic';
  channel: MessagingChannel;
  reportFile: string;
  totals: {
    total: number;
    passed: number;
    failed: number;
  };
  cases: QaCaseReport[];
};
