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
