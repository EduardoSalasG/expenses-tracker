import type { MessagingProvider } from '../../application/ports.js';
import type { AppConfig } from '../config.js';
import type { AppLogger } from '../logger.js';

export class TelegramProvider implements MessagingProvider {
  constructor(
    private readonly config: AppConfig,
    private readonly logger: AppLogger
  ) {}

  async sendText(recipientId: string, body: string) {
    if (!this.config.telegramBotToken) {
      this.logger.info('Telegram provider is not configured; message skipped.', {
        recipientId,
        messageLength: body.length
      });
      return { skipped: true };
    }

    const url = `${this.config.telegramBotApiBaseUrl}/bot${this.config.telegramBotToken}/sendMessage`;
    const payload = {
      chat_id: recipientId,
      text: body
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    const responseText = await response.text();
    const responseBody = parseJsonResponse(responseText);

    if (!response.ok) {
      this.logger.error('Telegram send failed.', { status: response.status, responseBody });
      throw new Error('Telegram send failed.');
    }

    this.logger.info('Telegram send accepted.', { status: response.status, responseBody });
    return responseBody;
  }
}

function parseJsonResponse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
