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
      if (batch.channel === 'telegram' && message.replyTo && (isStartCommand(message.message) || isWebAccessRequest(message.message))) {
        const linkUrl = await this.buildTelegramLoginUrl(message.replyTo);
        await this.container.messaging.sendText(
          message.replyTo,
          isStartCommand(message.message)
            ? buildTelegramStartMessage(linkUrl)
            : buildTelegramWebMessage(linkUrl),
          { channel: 'telegram' }
        );
        this.container.logger.info('Telegram access link command processed.', {
          channel: batch.channel,
          replyTo: message.replyTo,
          command: isStartCommand(message.message) ? 'start' : 'web'
        });
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

  private async buildTelegramLoginUrl(chatId: string) {
    const { token } = await this.container.useCases.requestTelegramLinkToken.execute(chatId);
    return `${this.container.config.frontendPublicOrigin.replace(/\/$/, '')}/login?linkToken=${encodeURIComponent(token)}`;
  }
}

function isStartCommand(message: string) {
  return /^\/start\b/i.test(message.trim());
}

function isWebAccessRequest(message: string) {
  const trimmed = message.trim().toLowerCase();
  if (/^\/web\b/.test(trimmed)) return true;

  return (
    /\b(web|sitio|pagina|página|app|aplicacion|aplicación|dashboard|panel|login)\b/.test(trimmed) &&
    /\b(abrir|abre|open|entrar|ingresar|pasame|pásame|mandame|mándame|enviame|envíame|quiero|dame|comparteme|compárteme|link)\b/.test(trimmed)
  );
}

function buildTelegramStartMessage(linkUrl: string) {
  return [
    'Bienvenido a Expenses Tracker.',
    'Para conectar tu cuenta, abre este enlace desde tu navegador:',
    linkUrl
  ].join('\n');
}

function buildTelegramWebMessage(linkUrl: string) {
  return [
    'Aquí tienes tu acceso web.',
    'Ábrelo para entrar directo al login y continuar con tu cuenta:',
    linkUrl
  ].join('\n');
}
