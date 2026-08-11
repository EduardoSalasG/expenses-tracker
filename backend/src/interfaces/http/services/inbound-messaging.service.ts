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

        if (isCommandsRequest(message.message)) {
          const language = await this.resolveTelegramLanguage(message.providerUserId ?? message.replyTo);
          await this.container.messaging.sendText(
            message.replyTo,
            buildTelegramCommandsMessage(language),
            { channel: 'telegram' }
          );
          this.container.logger.info('Telegram commands help processed.', {
            channel: batch.channel,
            replyTo: message.replyTo,
            command: 'commands'
          });
          continue;
        }

        if (isAccountsRequest(message.message)) {
          const accountMessage = await this.buildTelegramAccountsMessage(message.providerUserId ?? message.replyTo);
          await this.container.messaging.sendText(
            message.replyTo,
            accountMessage,
            { channel: 'telegram' }
          );
          this.container.logger.info('Telegram accounts command processed.', {
            channel: batch.channel,
            replyTo: message.replyTo,
            command: 'accounts'
          });
          continue;
        }

        if (isCurrentAccountRequest(message.message)) {
          const currentMessage = await this.buildTelegramCurrentAccountMessage(message.providerUserId ?? message.replyTo);
          await this.container.messaging.sendText(
            message.replyTo,
            currentMessage,
            { channel: 'telegram' }
          );
          this.container.logger.info('Telegram current account command processed.', {
            channel: batch.channel,
            replyTo: message.replyTo,
            command: 'current'
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

  private async resolveTelegramLanguage(chatId?: string) {
    if (!chatId) return 'es' as const;
    const user = await this.container.users.findByTelegramChatId(chatId);
    return user?.preferredLanguage ?? 'es';
  }

  private async buildTelegramAccountsMessage(chatId?: string) {
    const linkedUser = await this.resolveLinkedTelegramUser(chatId);
    if (!linkedUser) return telegramUnlinkedShortMessage('es');

    const [accounts, current] = await Promise.all([
      this.container.useCases.financialAccounts.listAccounts(linkedUser.id),
      this.container.useCases.financialAccounts.resolveMessagingContext({
        userId: linkedUser.id,
        channel: 'telegram',
        providerUserId: chatId
      })
    ]);

    return buildTelegramAccountsMessage(linkedUser.preferredLanguage ?? 'es', accounts, current.account.id);
  }

  private async buildTelegramCurrentAccountMessage(chatId?: string) {
    const linkedUser = await this.resolveLinkedTelegramUser(chatId);
    if (!linkedUser) return telegramUnlinkedShortMessage('es');

    const current = await this.container.useCases.financialAccounts.resolveMessagingContext({
      userId: linkedUser.id,
      channel: 'telegram',
      providerUserId: chatId
    });

    return buildTelegramCurrentAccountMessage(linkedUser.preferredLanguage ?? 'es', current.account.name);
  }

  private async resolveLinkedTelegramUser(chatId?: string) {
    if (!chatId) return undefined;
    return this.container.users.findByTelegramChatId(chatId);
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

function isCommandsRequest(message: string) {
  return /^\/(?:commands|help)\b/i.test(message.trim());
}

function isAccountsRequest(message: string) {
  return /^\/(?:accounts|cuentas)\b/i.test(message.trim());
}

function isCurrentAccountRequest(message: string) {
  return /^\/(?:current|actual)\b/i.test(message.trim());
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

function buildTelegramCommandsMessage(language: 'es' | 'en') {
  if (language === 'en') {
    return [
      'Available commands and requests:',
      '',
      '1) Open the web app',
      'Command: /web',
      'Example reply: I send you a direct login link to the web app.',
      '',
      '2) Connect Telegram to your account',
      'Command: /link +56912345678',
      'Example reply: Telegram is now connected to your account.',
      '',
      '3) Save an expense',
      'Example command: I spent 25,000 on sushi with BCI debit card',
      'Example reply: Expense saved with amount, concept, and category.',
      '',
      '4) Save an income',
      'Example command: Salary income 1,200,000 by bank transfer',
      'Example reply: Income saved with amount and concept.',
      '',
      '5) Ask for your monthly spending',
      'Example command: How much did I spend this month?',
      'Example reply: I send you the total plus the category breakdown.',
      '',
      '6) Ask for your budget status',
      'Example command: How is my budget this month?',
      'Example reply: I send you spent amount, remaining budget, and progress.',
      '',
      '7) Edit a recent movement',
      'Example command: Change the category of this expense to restaurants',
      'Example reply: I update the movement and confirm the new values.',
      '',
      '8) Review your available accounts',
      'Command: /accounts',
      'Example reply: I list your personal/shared accounts and mark the active one.',
      '',
      '9) Check the current account for this chat',
      'Command: /current',
      'Example reply: I tell you which account is active and how to switch.',
      '',
      '10) Confirm or discard duplicates',
      'Example command: save',
      'Example reply: I keep the movement even if it looks duplicated.',
      'Example command: discard',
      'Example reply: I ignore the duplicated movement.',
      '',
      'Tip: you can also write naturally. I will interpret the movement and ask if anything is missing.'
    ].join('\n');
  }

  return [
    'Comandos y solicitudes disponibles:',
    '',
    '1) Abrir la web',
    'Comando: /web',
    'Ejemplo de respuesta: te envío un enlace directo para entrar a la web.',
    '',
    '2) Vincular Telegram con tu cuenta',
    'Comando: /link +56912345678',
    'Ejemplo de respuesta: Telegram quedó conectado a tu cuenta.',
    '',
    '3) Guardar un gasto',
    'Ejemplo de comando: Gasté 25.000 en sushi con débito BCI',
    'Ejemplo de respuesta: guardo el gasto con monto, concepto y categoría.',
    '',
    '4) Guardar un ingreso',
    'Ejemplo de comando: Ingreso de sueldo 1.200.000 por transferencia',
    'Ejemplo de respuesta: guardo el ingreso con monto y concepto.',
    '',
    '5) Preguntar cuánto gastaste en el mes',
    'Ejemplo de comando: ¿Cuánto gasté este mes?',
    'Ejemplo de respuesta: te envío el total y el desglose por categoría.',
    '',
    '6) Preguntar por tu presupuesto',
    'Ejemplo de comando: ¿Cómo va mi presupuesto este mes?',
    'Ejemplo de respuesta: te envío cuánto llevas gastado, cuánto te queda y el avance.',
    '',
    '7) Editar un movimiento reciente',
    'Ejemplo de comando: Cambia la categoría de este gasto a restaurantes',
    'Ejemplo de respuesta: actualizo el movimiento y te confirmo los nuevos datos.',
    '',
    '8) Revisar tus cuentas disponibles',
    'Comando: /accounts',
    'Ejemplo de respuesta: te listo tus cuentas personales/compartidas y marco la activa.',
    '',
    '9) Ver la cuenta actual de este chat',
    'Comando: /current',
    'Ejemplo de respuesta: te digo qué cuenta está activa y cómo cambiarla.',
    '',
    '10) Confirmar o descartar duplicados',
    'Ejemplo de comando: guardar',
    'Ejemplo de respuesta: mantengo el movimiento aunque parezca duplicado.',
    'Ejemplo de comando: descartar',
    'Ejemplo de respuesta: ignoro el movimiento duplicado.',
    '',
    'Tip: también puedes escribir como lo harías normalmente. Yo interpreto el movimiento y te pregunto si falta algo.'
  ].join('\n');
}

function telegramUnlinkedShortMessage(language: 'es' | 'en') {
  return language === 'en'
    ? 'Your Telegram is not linked yet. First connect it from the web or send /link with your registered phone number.'
    : 'Tu Telegram aún no está vinculado. Primero conéctalo desde la web o envía /link con tu teléfono registrado.';
}

function buildTelegramAccountsMessage(
  language: 'es' | 'en',
  accounts: Array<{ account: { id: string; name: string; type: 'personal' | 'shared' }; role: 'owner' | 'admin' | 'member' }>,
  currentAccountId: string
) {
  const lines = accounts.map(({ account, role }) => {
    const currentMarker = account.id === currentAccountId ? (language === 'en' ? ' [active]' : ' [activa]') : '';
    const typeLabel = language === 'en'
      ? account.type === 'personal' ? 'personal' : 'shared'
      : account.type === 'personal' ? 'personal' : 'compartida';
    return `- ${account.name}${currentMarker} · ${typeLabel} · ${role}`;
  });

  if (language === 'en') {
    return [
      'These are your available accounts in Telegram:',
      ...lines,
      '',
      'To switch, send /AccountName exactly as it appears above.'
    ].join('\n');
  }

  return [
    'Estas son tus cuentas disponibles en Telegram:',
    ...lines,
    '',
    'Para cambiar, envía /NombreCuenta tal como aparece arriba.'
  ].join('\n');
}

function buildTelegramCurrentAccountMessage(language: 'es' | 'en', accountName: string) {
  return language === 'en'
    ? `The active account for this chat is "${accountName}". Use /accounts to view all available accounts and /AccountName to switch.`
    : `La cuenta activa de este chat es "${accountName}". Usa /accounts para ver tus cuentas disponibles y /NombreCuenta para cambiar.`;
}
