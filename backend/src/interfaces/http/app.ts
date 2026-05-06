import { createHmac, timingSafeEqual } from 'node:crypto';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import type { ZodSchema } from 'zod';
import type { AppContainer } from '../../infrastructure/container.js';
import { requireAuth, type AuthenticatedRequest } from './middleware.js';
import { openApiSpec } from './openapi.js';
import {
  createCategorySchema,
  createExpenseSchema,
  createIncomeSchema,
  expenseQuerySchema,
  incomeQuerySchema,
  monthlyBudgetSchema,
  refreshTokenSchema,
  reportPreferencesSchema,
  reportQuerySchema,
  requestOtpSchema,
  updateProfileSchema,
  verifyOtpSchema
} from './schemas.js';

interface RequestWithRawBody extends express.Request {
  rawBody?: Buffer;
}

export function createApp(container: AppContainer) {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: container.config.frontendOrigin }));
  app.use(express.json({
    verify: (request: RequestWithRawBody, _response, buffer) => {
      request.rawBody = Buffer.from(buffer);
    }
  }));

  app.get('/health', (_request, response) => response.json({ status: 'ok' }));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

  app.post('/auth/otp/request', asyncHandler(async (request, response) => {
    const body = parseBody(requestOtpSchema, request.body);
    response.json(await container.useCases.requestOtp.execute(body.phoneNumber));
  }));

  app.post('/auth/otp/verify', asyncHandler(async (request, response) => {
    const body = parseBody(verifyOtpSchema, request.body);
    response.json(await container.useCases.verifyOtp.execute(body));
  }));

  app.post('/auth/refresh', asyncHandler(async (request, response) => {
    const body = parseBody(refreshTokenSchema, request.body);
    response.json(await container.useCases.refreshSession.execute(body.refreshToken));
  }));

  app.get('/webhooks/whatsapp', (request, response) => {
    const mode = request.query['hub.mode'];
    const token = request.query['hub.verify_token'];
    const challenge = request.query['hub.challenge'];
    if (mode === 'subscribe' && token === container.config.whatsappVerifyToken) {
      response.status(200).send(challenge);
      return;
    }
    response.sendStatus(403);
  });

  app.post('/webhooks/whatsapp', logWebhookAttempt(container), verifyMetaSignature(container), asyncHandler(async (request, response) => {
    const messages = extractWhatsAppMessages(request.body);
    container.logger.info('WhatsApp webhook received.', {
      extractedMessages: messages.length,
      bodyShape: request.body?.entry ? 'entry_changes' : request.body?.field ? 'field_value' : 'unknown'
    });
    for (const message of messages) {
      const result = await container.useCases.processWhatsAppExpense.execute(message);
      container.logger.info('WhatsApp webhook message processed.', {
        providerMessageId: message.providerMessageId,
        fromPhoneNumber: message.fromPhoneNumber,
        status: result.status
      });
    }
    response.json({ received: true });
  }));

  const auth = requireAuth(container);

  app.get('/me', auth, asyncHandler(async (request, response) => {
    const authRequest = request as AuthenticatedRequest;
    response.json(await container.users.findById(authRequest.auth.userId));
  }));

  app.put('/me', auth, asyncHandler(async (request, response) => {
    const authRequest = request as AuthenticatedRequest;
    const body = parseBody(updateProfileSchema, request.body);
    response.json(await container.useCases.updateProfile.execute(authRequest.auth.userId, body));
  }));

  app.post('/expenses', auth, asyncHandler(async (request, response) => {
    const authRequest = request as AuthenticatedRequest;
    const body = parseBody(createExpenseSchema, request.body);
    response.status(201).json(await container.useCases.finance.createExpense({
      ...body,
      tenantId: authRequest.auth.tenantId,
      userId: authRequest.auth.userId
    }));
  }));

  app.get('/expenses', auth, asyncHandler(async (request, response) => {
    const authRequest = request as AuthenticatedRequest;
    const query = expenseQuerySchema.parse(request.query);
    response.json(await container.useCases.finance.listExpenses({
      ...query,
      tenantId: authRequest.auth.tenantId
    }));
  }));

  app.get('/expenses/recent', auth, asyncHandler(async (request, response) => {
    const authRequest = request as AuthenticatedRequest;
    const limit = Number(request.query.limit ?? 10);
    response.json(await container.useCases.finance.recentExpenses(authRequest.auth.tenantId, limit));
  }));

  app.post('/incomes', auth, asyncHandler(async (request, response) => {
    const authRequest = request as AuthenticatedRequest;
    const body = parseBody(createIncomeSchema, request.body);
    response.status(201).json(await container.useCases.finance.createIncome({
      ...body,
      tenantId: authRequest.auth.tenantId,
      userId: authRequest.auth.userId
    }));
  }));

  app.get('/incomes', auth, asyncHandler(async (request, response) => {
    const authRequest = request as AuthenticatedRequest;
    const query = incomeQuerySchema.parse(request.query);
    response.json(await container.useCases.finance.listIncomes({
      ...query,
      tenantId: authRequest.auth.tenantId
    }));
  }));

  app.get('/categories', auth, asyncHandler(async (request, response) => {
    const authRequest = request as AuthenticatedRequest;
    response.json(await container.useCases.finance.listCategories(authRequest.auth.tenantId));
  }));

  app.post('/categories', auth, asyncHandler(async (request, response) => {
    const authRequest = request as AuthenticatedRequest;
    const body = parseBody(createCategorySchema, request.body);
    response.status(201).json(await container.useCases.finance.createCategory({
      ...body,
      tenantId: authRequest.auth.tenantId,
      isDefault: false
    }));
  }));

  app.get('/budgets/monthly', auth, asyncHandler(async (request, response) => {
    const authRequest = request as AuthenticatedRequest;
    const month = String(request.query.month ?? new Date().toISOString().slice(0, 7));
    response.json(await container.useCases.finance.monthlyBudgets(authRequest.auth.tenantId, month));
  }));

  app.put('/budgets/monthly', auth, asyncHandler(async (request, response) => {
    const authRequest = request as AuthenticatedRequest;
    const body = parseBody(monthlyBudgetSchema, request.body);
    response.json(await container.useCases.finance.upsertMonthlyBudget({
      ...body,
      tenantId: authRequest.auth.tenantId
    }));
  }));

  app.get('/reports', auth, asyncHandler(async (request, response) => {
    const authRequest = request as AuthenticatedRequest;
    const query = reportQuerySchema.parse(request.query);
    response.json(await container.useCases.finance.report(authRequest.auth.tenantId, query.from, query.to));
  }));

  app.put('/report-preferences', auth, asyncHandler(async (request, response) => {
    const authRequest = request as AuthenticatedRequest;
    const body = parseBody(reportPreferencesSchema, request.body);
    response.json(await container.useCases.updateReportPreferences.execute(authRequest.auth.userId, body.preferences));
  }));

  app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    container.logger.error('HTTP error', { error });
    const message = error instanceof Error ? error.message : 'Unexpected error.';
    response.status(message.includes('Invalid') ? 400 : 500).json({ error: message });
  });

  return app;
}

function parseBody<T>(schema: ZodSchema<T>, body: unknown): T {
  return schema.parse(body);
}

function asyncHandler(handler: (request: express.Request, response: express.Response) => Promise<void>) {
  return (request: express.Request, response: express.Response, next: express.NextFunction) => {
    handler(request, response).catch(next);
  };
}

function verifyMetaSignature(container: AppContainer) {
  return (request: RequestWithRawBody, response: express.Response, next: express.NextFunction) => {
    if (!container.config.whatsappAppSecret) {
      container.logger.warn('Meta signature verification skipped because WHATSAPP_APP_SECRET is not configured.');
      next();
      return;
    }

    const signatureHeader = request.header('x-hub-signature-256');
    if (!signatureHeader?.startsWith('sha256=')) {
      container.logger.warn('Meta webhook rejected: missing x-hub-signature-256 header.', {
        hasRawBody: Boolean(request.rawBody?.length)
      });
      response.status(401).json({ error: 'Missing Meta webhook signature.' });
      return;
    }

    const expectedSignature = createHmac('sha256', container.config.whatsappAppSecret)
      .update(request.rawBody ?? Buffer.from(''))
      .digest('hex');
    const actualSignature = signatureHeader.slice('sha256='.length);

    const expected = Buffer.from(expectedSignature, 'hex');
    const actual = Buffer.from(actualSignature, 'hex');

    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      container.logger.warn('Meta webhook rejected: invalid x-hub-signature-256 header.', {
        expectedLength: expected.length,
        actualLength: actual.length,
        hasRawBody: Boolean(request.rawBody?.length)
      });
      response.status(401).json({ error: 'Invalid Meta webhook signature.' });
      return;
    }

    next();
  };
}

function logWebhookAttempt(container: AppContainer) {
  return (request: RequestWithRawBody, _response: express.Response, next: express.NextFunction) => {
    container.logger.info('WhatsApp webhook POST attempted.', {
      contentType: request.header('content-type'),
      hasSignature: Boolean(request.header('x-hub-signature-256')),
      rawBodyBytes: request.rawBody?.length ?? 0,
      bodyShape: request.body?.entry ? 'entry_changes' : request.body?.field ? 'field_value' : 'unknown'
    });
    next();
  };
}

export function extractWhatsAppMessages(body: any): Array<{ providerMessageId?: string; fromPhoneNumber: string; message: string }> {
  if (body?.field === 'messages' && body?.value?.messages) {
    return messagesFromValue(body.value);
  }

  const entries = body?.entry ?? [];
  return entries.flatMap((entry: any) =>
    (entry?.changes ?? []).flatMap((change: any) =>
      messagesFromValue(change?.value)
    )
  );
}

function messagesFromValue(value: any): Array<{ providerMessageId?: string; fromPhoneNumber: string; message: string }> {
  return (value?.messages ?? [])
    .filter((message: any) => message.type === 'text')
    .map((message: any) => ({
      providerMessageId: message.id,
      fromPhoneNumber: normalizeWhatsAppPhone(message.from),
      message: message.text.body
    }));
}

function normalizeWhatsAppPhone(phoneNumber: string): string {
  return phoneNumber?.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
}
