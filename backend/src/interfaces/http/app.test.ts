import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app.js';
import { extractWhatsAppMessages, extractWhatsAppStatuses } from './messaging-providers/whatsapp.extractor.js';
import { extractTelegramMessages } from './messaging-providers/telegram.extractor.js';
import { createContainer } from '../../infrastructure/container.js';
import type { AppConfig } from '../../infrastructure/config.js';

describe('Messaging routes', () => {
  it('returns a stable 401 contract when a protected route has no bearer token', async () => {
    const app = createApp(createContainer(testConfig()));

    const response = await request(app).get('/expenses');

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ error: 'Authentication required.', code: 'AUTH_REQUIRED' });
    expect(response.body.requestId).toEqual(expect.any(String));
  });

  it('returns a stable 400 validation contract for an invalid OTP request', async () => {
    const app = createApp(createContainer(testConfig()));

    const response = await request(app)
      .post('/auth/otp/request')
      .send({ phoneNumber: '' });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ error: 'Validation failed.', code: 'VALIDATION_ERROR' });
    expect(response.body.requestId).toEqual(expect.any(String));
  });

  it('limits OTP requests from one IP and returns Retry-After', async () => {
    const app = createApp(createContainer(testConfig()));

    for (let attempt = 0; attempt < 20; attempt += 1) {
      await request(app)
        .post('/auth/otp/request')
        .set('x-forwarded-for', '203.0.113.10')
        .send({ phoneNumber: `+56982439${String(attempt).padStart(3, '0')}`, telegramChatId: '12345' });
    }

    const response = await request(app)
      .post('/auth/otp/request')
      .set('x-forwarded-for', '203.0.113.10')
      .send({ phoneNumber: '+56982439999', telegramChatId: '12345' });

    expect(response.status).toBe(429);
    expect(response.headers['retry-after']).toBe('900');
  });

  it('limits OTP requests for one identity across different IPs', async () => {
    const app = createApp(createContainer(testConfig()));

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await request(app)
        .post('/auth/otp/request')
        .set('x-forwarded-for', `203.0.113.${attempt + 20}`)
        .send({ phoneNumber: '+56982439041', telegramChatId: '12345' });
    }

    const response = await request(app)
      .post('/auth/otp/request')
      .set('x-forwarded-for', '203.0.113.99')
      .send({ phoneNumber: '+56982439041', telegramChatId: '12345' });

    expect(response.status).toBe(429);
    expect(response.headers['retry-after']).toBe('900');
  });

  it('returns 429 and Retry-After when an OTP is requested during cooldown', async () => {
    const app = createApp(createContainer(testConfig()));

    await request(app)
      .post('/auth/otp/request')
      .set('x-forwarded-for', '203.0.113.120')
      .send({ phoneNumber: '+56982439041', telegramChatId: '12345' });

    const response = await request(app)
      .post('/auth/otp/request')
      .set('x-forwarded-for', '203.0.113.121')
      .send({ phoneNumber: '+56982439041', telegramChatId: '12345' });

    expect(response.status).toBe(429);
    expect(response.headers['retry-after']).toBe('60');
  });

  it('does not expose the Telegram webhook without its verification secret', async () => {
    const app = createApp(createContainer(testConfig({ telegramWebhookSecretToken: '' })));

    const response = await request(app).post('/webhooks/telegram').send({ message: {} });

    expect(response.status).toBe(404);
  });

  it('does not expose WhatsApp webhook route in telegram-only mode', async () => {
    const app = createApp(createContainer(testConfig()));
    const response = await request(app).post('/webhooks/whatsapp').send({ entry: [] });
    expect(response.status).toBe(404);
  });

  it('does not let an anonymous client mint a Telegram login token for an arbitrary chat', async () => {
    const app = createApp(createContainer(testConfig()));

    const response = await request(app)
      .post('/auth/telegram/link-token')
      .send({ chatId: 'another-users-chat' });

    expect(response.status).toBe(404);
  });
});

describe('Financial account isolation routes', () => {
  it('rejects update and delete mutations with IDs from another account of the same tenant', async () => {
    const container = createContainer(testConfig());
    const user = await container.users.upsertByPhoneNumber({
      phoneNumber: '+56970000001',
      firstName: 'Account',
      lastName: 'Owner',
      preferredName: 'Owner',
      countryOfResidence: 'Chile',
      preferredCurrency: 'CLP',
      preferredLanguage: 'es'
    });
    const personal = await container.financialAccounts.ensurePersonalAccount(user.id);
    const source = await container.useCases.financialAccounts.createSharedAccount({
      userId: user.id,
      tenantId: user.tenantId,
      sourceFinancialAccountId: personal.id,
      name: 'Source',
      currency: 'CLP'
    });
    const foreign = await container.useCases.financialAccounts.createSharedAccount({
      userId: user.id,
      tenantId: user.tenantId,
      sourceFinancialAccountId: personal.id,
      name: 'Foreign',
      currency: 'CLP'
    });
    const category = await container.useCases.finance.createCategory({
      tenantId: user.tenantId,
      financialAccountId: source.account.id,
      name: 'Source category',
      isDefault: false
    });
    const expense = await container.useCases.finance.createExpense({
      tenantId: user.tenantId,
      financialAccountId: source.account.id,
      userId: user.id,
      date: '2026-09-16T00:00:00.000Z',
      amount: 1000,
      currency: 'CLP',
      concept: 'Source expense',
      categoryId: category.id,
      paymentMethod: { kind: 'cash' }
    });
    const income = await container.useCases.finance.createIncome({
      tenantId: user.tenantId,
      financialAccountId: source.account.id,
      userId: user.id,
      date: '2026-09-16T00:00:00.000Z',
      amount: 2000,
      currency: 'CLP',
      concept: 'Source income'
    });
    const bank = await container.useCases.finance.createBankOption({
      tenantId: user.tenantId,
      financialAccountId: source.account.id,
      name: 'Source bank',
      isDefault: false
    });
    const paymentMethod = await container.useCases.finance.createPaymentMethodOption({
      tenantId: user.tenantId,
      financialAccountId: source.account.id,
      name: 'Source card',
      kind: 'card',
      cardType: 'credit',
      isDefault: false
    });
    const app = createApp(container);
    const authorization = `Bearer ${container.tokens.signAccessToken(user, foreign.account.id)}`;

    const updateResponses = await Promise.all([
      request(app).put(`/expenses/${expense.id}`).set('authorization', authorization).send({
        date: expense.date,
        amount: expense.amount,
        currency: expense.currency,
        concept: expense.concept,
        categoryId: expense.categoryId,
        paymentMethod: expense.paymentMethod
      }),
      request(app).put(`/incomes/${income.id}`).set('authorization', authorization).send({
        date: income.date,
        amount: income.amount,
        currency: income.currency,
        concept: income.concept
      }),
      request(app).put(`/banks/${bank.id}`).set('authorization', authorization).send({ name: bank.name }),
      request(app).put(`/payment-method-options/${paymentMethod.id}`).set('authorization', authorization).send({
        name: paymentMethod.name,
        kind: paymentMethod.kind,
        cardType: paymentMethod.cardType
      })
    ]);
    const deleteResponses = await Promise.all([
      request(app).delete(`/expenses/${expense.id}`).set('authorization', authorization),
      request(app).delete(`/incomes/${income.id}`).set('authorization', authorization),
      request(app).delete(`/banks/${bank.id}`).set('authorization', authorization),
      request(app).delete(`/payment-method-options/${paymentMethod.id}`).set('authorization', authorization)
    ]);

    for (const response of [...updateResponses, ...deleteResponses]) {
      expect(response.status).toBe(404);
    }
  });
});

describe('extractWhatsAppMessages', () => {
  it('extracts messages from real Meta webhook wrapper', () => {
    const messages = extractWhatsAppMessages({
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    id: 'wamid.real-wrapper',
                    from: '56982439041',
                    type: 'text',
                    text: { body: 'CLP 12500 groceries cash' }
                  }
                ]
              }
            }
          ]
        }
      ]
    });

    expect(messages).toEqual([{
      providerMessageId: 'wamid.real-wrapper',
      channel: 'whatsapp',
      fromPhoneNumber: '+56982439041',
      message: 'CLP 12500 groceries cash'
    }]);
  });

  it('extracts messages from Meta console field sample wrapper', () => {
    const messages = extractWhatsAppMessages({
      field: 'messages',
      value: {
        messages: [
          {
            id: 'ABGGFlA5Fpa',
            from: '16315551181',
            type: 'text',
            text: { body: 'this is a text message' }
          }
        ]
      }
    });

    expect(messages).toEqual([{
      providerMessageId: 'ABGGFlA5Fpa',
      channel: 'whatsapp',
      fromPhoneNumber: '+16315551181',
      message: 'this is a text message'
    }]);
  });
});

describe('extractWhatsAppStatuses', () => {
  it('extracts delivery statuses from Meta webhook wrapper', () => {
    const statuses = extractWhatsAppStatuses({
      entry: [
        {
          changes: [
            {
              value: {
                statuses: [
                  {
                    id: 'wamid.delivery',
                    recipient_id: '56982439041',
                    status: 'failed',
                    timestamp: '1760000000',
                    conversation: { id: 'conversation-id' },
                    errors: [{ code: 131026, title: 'Message undeliverable' }]
                  }
                ]
              }
            }
          ]
        }
      ]
    });

    expect(statuses).toEqual([{
      providerMessageId: 'wamid.delivery',
      recipientPhoneNumber: '+56982439041',
      status: 'failed',
      timestamp: '1760000000',
      conversationId: 'conversation-id',
      errors: [{ code: 131026, title: 'Message undeliverable' }]
    }]);
  });
});

describe('Telegram webhook', () => {
  it('extracts text messages and provider ids without requiring contact payload', () => {
    const messages = extractTelegramMessages({
      message: {
        message_id: 42,
        text: '20000 bachata classes transfer from bci',
        from: { id: 987654, username: 'edu' },
        chat: { id: 987654 }
      }
    });

    expect(messages).toEqual([{
      providerMessageId: '42',
      channel: 'telegram',
      fromPhoneNumber: 'tg:987654',
      providerUserId: '987654',
      replyTo: '987654',
      message: '20000 bachata classes transfer from bci'
    }]);
  });

  it('ignores updates without text body', async () => {
    const app = createApp(createContainer(testConfig()));
    const response = await request(app)
      .post('/webhooks/telegram')
      .set('x-telegram-bot-api-secret-token', 'telegram-test-secret')
      .send({
        message: {
          message_id: 77,
          from: { id: 123 }
        }
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ received: true, ignored: true });
  });
});

function testConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    nodeEnv: 'test',
    port: 0,
    databaseUrl: 'postgres://postgres:postgres@localhost:5432/expenses_tracker',
    jwtSecret: 'test-secret',
    jwtExpiresIn: '15m',
    refreshTokenExpiresInDays: 30,
    whatsappVerifyToken: 'verify-token',
    whatsappAppSecret: '',
    whatsappAccessToken: '',
    whatsappPhoneNumberId: '',
    whatsappBusinessAccountId: '',
    whatsappTestRecipientPhone: '',
    telegramBotToken: '',
    telegramBotApiBaseUrl: 'https://api.telegram.org',
    telegramWebhookSecretToken: 'telegram-test-secret',
    messageInterpreterProvider: 'deterministic',
    messageInterpreterApiKey: '',
    messageInterpreterBaseUrl: 'https://api.deepseek.com',
    messageInterpreterModel: 'deepseek-chat',
    messageInterpreterTemperature: 0.1,
    messageInterpreterHttpReferer: '',
    messageInterpreterAppName: 'Expenses Tracker',
    otpDebugResponseEnabled: false,
    frontendOrigin: 'http://localhost:4200',
    frontendOrigins: ['http://localhost:4200'],
    frontendPublicOrigin: 'http://localhost:4200',
    resendApiKey: '',
    resendApiBaseUrl: 'https://api.resend.com',
    resendFromEmail: '',
    telegramBotUsername: '',
    useInMemoryRepositories: true,
    legacyBudgetsEndpointsEnabled: true,
    ...overrides
  };
}
