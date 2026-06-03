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
      if (batch.channel === 'telegram' && message.replyTo) {
        const startPayload = getStartPayload(message.message);
        if (startPayload !== undefined) {
          const registrationLink = await this.tryBuildTelegramRegistrationLoginUrl(message.replyTo, startPayload);
          if (startPayload && !registrationLink) {
            await this.container.messaging.sendText(
              message.replyTo,
              buildTelegramRegistrationStartInvalidMessage(),
              { channel: 'telegram' }
            );
            this.container.logger.info('Telegram registration start payload rejected.', {
              channel: batch.channel,
              replyTo: message.replyTo
            });
            continue;
          }
          const linkUrl = registrationLink ?? await this.buildTelegramLoginUrl(message.replyTo);
          await this.container.messaging.sendText(
            message.replyTo,
            registrationLink
              ? buildTelegramRegistrationStartMessage(linkUrl)
              : buildTelegramStartMessage(linkUrl),
            { channel: 'telegram' }
          );
          this.container.logger.info('Telegram start command processed.', {
            channel: batch.channel,
            replyTo: message.replyTo,
            registrationLink: Boolean(registrationLink)
          });
          continue;
        }

        if (isWebAccessRequest(message.message)) {
          const linkUrl = await this.buildTelegramLoginUrl(message.replyTo);
          await this.container.messaging.sendText(
            message.replyTo,
            buildTelegramWebMessage(linkUrl),
            { channel: 'telegram' }
          );
          this.container.logger.info('Telegram access link command processed.', {
            channel: batch.channel,
            replyTo: message.replyTo,
            command: 'web'
          });
          continue;
        }
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

  private async tryBuildTelegramRegistrationLoginUrl(chatId: string, startPayload: string) {
    try {
      const { phoneNumber } = this.container.tokens.verifyTelegramRegistrationIntent(startPayload);
      const { token } = await this.container.useCases.requestTelegramLinkToken.execute(chatId, phoneNumber);
      return `${this.container.config.frontendPublicOrigin.replace(/\/$/, '')}/login?linkToken=${encodeURIComponent(token)}`;
    } catch {
      return undefined;
    }
  }
}

function getStartPayload(message: string) {
  const match = message.trim().match(/^\/start(?:\s+(.+))?$/i);
  if (!match) return undefined;
  return match[1]?.trim() || '';
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

function buildTelegramRegistrationStartMessage(linkUrl: string) {
  return [
    'Ya reconocí tu solicitud de registro.',
    'Vuelve a la web con este enlace para continuar y recibir tu código de acceso:',
    linkUrl
  ].join('\n');
}

function buildTelegramRegistrationStartInvalidMessage() {
  return 'Ese enlace de registro ya no es válido o expiró. Vuelve a la web y genera uno nuevo.';
}

function buildTelegramWebMessage(linkUrl: string) {
  return [
    'Aquí tienes tu acceso web.',
    'Ábrelo para entrar directo al login y continuar con tu cuenta:',
    linkUrl
  ].join('\n');
}
