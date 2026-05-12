import type { MessagingProvider } from '../../application/ports.js';
import type { AppLogger } from '../logger.js';

// Stub adapter for future Telegram outbound messaging support.
export class TelegramProvider implements MessagingProvider {
  constructor(private readonly logger: AppLogger) {}

  async sendText(toPhoneNumber: string, body: string) {
    this.logger.info('Telegram provider is not configured; message skipped.', {
      toPhoneNumber,
      messageLength: body.length
    });

    return { skipped: true };
  }
}

