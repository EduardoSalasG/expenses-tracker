import { createHmac } from 'node:crypto';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app.js';
import { extractWhatsAppMessages, extractWhatsAppStatuses } from './messaging-providers/whatsapp.extractor.js';
import { createContainer } from '../../infrastructure/container.js';
import type { AppConfig } from '../../infrastructure/config.js';

describe('WhatsApp webhook security', () => {
  it('rejects webhook posts when an app secret is configured and signature is missing', async () => {
    const app = createApp(createContainer(testConfig({ whatsappAppSecret: 'secret-for-tests' })));

    const response = await request(app)
      .post('/webhooks/whatsapp')
      .send({ entry: [] });

    expect(response.status).toBe(401);
  });

  it('accepts webhook posts with a valid Meta signature', async () => {
    const body = JSON.stringify({ entry: [] });
    const signature = createHmac('sha256', 'secret-for-tests').update(Buffer.from(body)).digest('hex');
    const app = createApp(createContainer(testConfig({ whatsappAppSecret: 'secret-for-tests' })));

    const response = await request(app)
      .post('/webhooks/whatsapp')
      .set('content-type', 'application/json')
      .set('x-hub-signature-256', `sha256=${signature}`)
      .send(body);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ received: true });
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
    messageInterpreterProvider: 'deterministic',
    messageInterpreterApiKey: '',
    messageInterpreterBaseUrl: 'https://api.deepseek.com',
    messageInterpreterModel: 'deepseek-chat',
    messageInterpreterTemperature: 0.1,
    otpDebugResponseEnabled: false,
    frontendOrigin: 'http://localhost:4200',
    useInMemoryRepositories: true,
    ...overrides
  };
}
