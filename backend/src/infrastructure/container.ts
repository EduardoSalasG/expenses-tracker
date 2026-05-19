import type { AppConfig } from './config.js';
import { createPool, pingDatabase } from './database.js';
import { createLogger } from './logger.js';
import { createMessageInterpreter } from './message-interpreter.provider.js';
import { JwtTokenService } from './token.service.js';
import { ChannelMessagingRouter } from './messaging-providers/channel-messaging-router.js';
import { TelegramProvider } from './messaging-providers/telegram.provider.js';
import { WhatsAppCloudProvider } from './messaging-providers/whatsapp.provider.js';
import {
  InMemoryBudgetRepository,
  InMemoryCategoryRepository,
  InMemoryExpenseRepository,
  InMemoryIncomeRepository,
  InMemoryMessagingMessageAuditRepository,
  InMemoryMessagingPendingDraftRepository,
  InMemoryOtpRepository,
  InMemoryReportDispatchRepository,
  InMemoryUserRepository
} from './repositories/in-memory.js';
import {
  PostgresBudgetRepository,
  PostgresCategoryRepository,
  PostgresExpenseRepository,
  PostgresIncomeRepository,
  PostgresMessagingMessageAuditRepository,
  PostgresMessagingPendingDraftRepository,
  PostgresOtpRepository,
  PostgresReportDispatchRepository,
  PostgresUserRepository
} from './repositories/postgres.js';
import {
  FinanceUseCases,
  ProcessInboundFinanceMessageUseCase,
  RefreshSessionUseCase,
  RequestOtpUseCase,
  SendDueReportsUseCase,
  UpdateProfileUseCase,
  UpdateReportPreferencesUseCase,
  VerifyOtpUseCase
} from '../application/use-cases.js';

export function createContainer(config: AppConfig) {
  const logger = createLogger();
  const clock = { now: () => new Date() };
  const pool = config.useInMemoryRepositories ? undefined : createPool(config);
  const users = pool ? new PostgresUserRepository(pool) : new InMemoryUserRepository();
  const otps = pool ? new PostgresOtpRepository(pool) : new InMemoryOtpRepository();
  const categories = pool ? new PostgresCategoryRepository(pool) : new InMemoryCategoryRepository();
  const expenses = pool ? new PostgresExpenseRepository(pool) : new InMemoryExpenseRepository();
  const incomes = pool ? new PostgresIncomeRepository(pool) : new InMemoryIncomeRepository();
  const budgets = pool ? new PostgresBudgetRepository(pool) : new InMemoryBudgetRepository();
  const messageAudits = pool ? new PostgresMessagingMessageAuditRepository(pool) : new InMemoryMessagingMessageAuditRepository();
  const pendingDrafts = pool ? new PostgresMessagingPendingDraftRepository(pool) : new InMemoryMessagingPendingDraftRepository();
  const reportDispatches = pool ? new PostgresReportDispatchRepository(pool) : new InMemoryReportDispatchRepository();
  const tokens = new JwtTokenService(config);
  const whatsappMessaging = new WhatsAppCloudProvider(config, logger);
  const telegramMessaging = new TelegramProvider(logger);
  const messaging = new ChannelMessagingRouter({
    whatsapp: whatsappMessaging,
    telegram: telegramMessaging
  });
  const interpreter = createMessageInterpreter(config, logger);
  const finance = new FinanceUseCases(expenses, incomes, budgets, categories);
  const processInboundFinanceMessage = new ProcessInboundFinanceMessageUseCase(
    users,
    categories,
    expenses,
    incomes,
    budgets,
    messageAudits,
    pendingDrafts,
    messaging,
    interpreter,
    clock
  );

  return {
    config,
    logger,
    users,
    tokens,
    close: () => pool?.end() ?? Promise.resolve(),
    readinessCheck: async () => {
      if (!pool) {
        return { status: 'ok' as const, checks: { database: 'in-memory' } };
      }
      await pingDatabase(pool);
      return { status: 'ok' as const, checks: { database: 'ok' } };
    },
    useCases: {
      requestOtp: new RequestOtpUseCase(users, otps, messaging, clock, {
        exposeOtpInResponse: config.nodeEnv !== 'production' && config.otpDebugResponseEnabled
      }),
      verifyOtp: new VerifyOtpUseCase(users, otps, categories, tokens, clock, messaging),
      refreshSession: new RefreshSessionUseCase(users, tokens),
      processInboundFinanceMessage,
      finance,
      updateProfile: new UpdateProfileUseCase(users),
      updateReportPreferences: new UpdateReportPreferencesUseCase(users),
      sendDueReports: new SendDueReportsUseCase(users, finance, messaging, reportDispatches, clock)
    }
  };
}

export type AppContainer = ReturnType<typeof createContainer>;
