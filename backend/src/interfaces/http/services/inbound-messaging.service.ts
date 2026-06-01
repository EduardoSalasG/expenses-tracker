import type { InboundTextMessage, MessagingChannel } from '../../../domain/index.js';
import type { AppContainer } from '../../../infrastructure/container.js';

export interface InboundDeliveryStatus {
  providerMessageId?: string;
  recipientPhoneNumber?: string;
  status: string;
  timestamp?: string;
  conversationId?: string;
  errors?: unknown[];
}

export interface InboundMessagingBatch {
  channel: MessagingChannel;
  providerName: string;
  bodyShape: string;
  messages: InboundTextMessage[];
  statuses: InboundDeliveryStatus[];
}

export class InboundMessagingService {
  constructor(private readonly container: AppContainer) {}

  async receive(batch: InboundMessagingBatch) {
    this.container.logger.info(`${batch.providerName} webhook received.`, {
      channel: batch.channel,
      extractedMessages: batch.messages.length,
      extractedStatuses: batch.statuses.length,
      bodyShape: batch.bodyShape
    });

    for (const status of batch.statuses) {
      this.container.logger.info(`${batch.providerName} webhook delivery status received.`, {
        channel: batch.channel,
        ...status
      });
    }

    for (const message of batch.messages) {
      if (batch.channel === 'telegram' && isStartCommand(message.message) && message.replyTo) {
        const { token } = await this.container.useCases.requestTelegramLinkToken.execute(message.replyTo);
        const linkUrl = `${this.container.config.frontendOrigin.replace(/\/$/, '')}/login?linkToken=${encodeURIComponent(token)}`;
        await this.container.messaging.sendText(
          message.replyTo,
          [
            'Bienvenido a Expenses Tracker.',
            'Para conectar tu cuenta, abre este enlace:',
            linkUrl
          ].join('\n'),
          { channel: 'telegram' }
        );
        this.container.logger.info('Telegram start command processed.', { channel: batch.channel, replyTo: message.replyTo });
        continue;
      }

      const result = await this.container.useCases.processInboundFinanceMessage.execute({
        ...message,
        channel: message.channel ?? batch.channel
      });
      this.container.logger.info(`${batch.providerName} webhook message processed.`, {
        channel: batch.channel,
        providerMessageId: message.providerMessageId,
        fromPhoneNumber: message.fromPhoneNumber,
        status: result.status
      });
    }
  }
}

function isStartCommand(message: string) {
  return /^\/start\b/i.test(message.trim());
}
