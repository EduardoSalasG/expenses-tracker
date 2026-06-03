import type { EmailProvider } from '../../application/ports.js';
import type { AppConfig } from '../config.js';
import type { AppLogger } from '../logger.js';

export class ResendEmailProvider implements EmailProvider {
  constructor(
    private readonly config: AppConfig,
    private readonly logger: AppLogger
  ) {}

  async send(options: { to: string; subject: string; html: string; text?: string }) {
    if (!this.config.resendApiKey) {
      throw new Error('Resend API key is not configured.');
    }

    if (!this.config.resendFromEmail) {
      throw new Error('Resend from email is not configured.');
    }

    const response = await fetch(`${this.config.resendApiBaseUrl.replace(/\/$/, '')}/emails`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: this.config.resendFromEmail,
        to: [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text
      })
    });

    if (!response.ok) {
      const responseBody = await safeJson(response);
      this.logger.error('Resend email send failed.', {
        status: response.status,
        responseBody
      });
      throw new Error('Could not send magic link email.');
    }
  }
}

async function safeJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}
