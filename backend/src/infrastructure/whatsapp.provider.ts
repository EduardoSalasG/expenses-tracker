import type { MessagingProvider } from '../application/ports.js';
import type { AppConfig } from './config.js';
import type { AppLogger } from './logger.js';

export class WhatsAppCloudProvider implements MessagingProvider {
  constructor(
    private readonly config: AppConfig,
    private readonly logger: AppLogger
  ) {}

  async sendText(toPhoneNumber: string, body: string) {
    if (!this.config.whatsappAccessToken || !this.config.whatsappPhoneNumberId) {
      this.logger.info('WhatsApp provider is not configured; message skipped.', { toPhoneNumber, body });
      return { skipped: true };
    }

    const url = `https://graph.facebook.com/v21.0/${this.config.whatsappPhoneNumberId}/messages`;
    const payload = {
      messaging_product: 'whatsapp',
      to: toPhoneNumber,
      type: 'text',
      text: { body }
    };

    this.logger.info('Sending WhatsApp text message.', {
      phoneNumberId: this.config.whatsappPhoneNumberId,
      toPhoneNumber,
      messageLength: body.length
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.whatsappAccessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const text = await response.text();
    const responseBody = parseJsonResponse(text);

    if (!response.ok) {
      this.logger.error('WhatsApp send failed.', { status: response.status, responseBody });
      throw new Error('WhatsApp send failed.');
    }

    this.logger.info('WhatsApp send accepted by Meta.', { status: response.status, responseBody });
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
