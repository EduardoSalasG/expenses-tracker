import { randomUUID } from 'node:crypto';
import type { CategoryRepository, Clock, MessagingProvider, OtpRepository, TelegramLinkTokenRepository, TokenService, UserRepository } from '../ports.js';

export class RequestOtpUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly otps: OtpRepository,
    private readonly messaging: MessagingProvider,
    private readonly clock: Clock,
    private readonly options: { exposeOtpInResponse: boolean } = { exposeOtpInResponse: false }
  ) {}

  async execute(input: { phoneNumber: string; telegramChatId?: string }) {
    const existingUser = await this.users.findByPhoneNumber(input.phoneNumber);
    if (existingUser && input.telegramChatId && input.telegramChatId !== existingUser.telegramChatId) {
      await this.users.linkTelegramChatByPhone(existingUser.phoneNumber, input.telegramChatId);
    }
    const targetChatId = input.telegramChatId ?? existingUser?.telegramChatId;
    if (!targetChatId) {
      throw new Error('Telegram chat is not linked. Open the bot and send /link +<your-phone-number>, then request OTP again.');
    }

    if (!existingUser && !input.telegramChatId) {
      throw new Error('Telegram chat id is required for new users.');
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(this.clock.now().getTime() + 10 * 60 * 1000);
    await this.otps.create(input.phoneNumber, code, expiresAt);
    await this.messaging.sendText(targetChatId, buildOtpMessage(existingUser?.preferredLanguage ?? 'es', code), { channel: 'telegram' });
    return {
      sent: true,
      requiresRegistration: !existingUser,
      ...(this.options.exposeOtpInResponse ? { debugCode: code } : {})
    };
  }
}

export class RequestTelegramLinkTokenUseCase {
  constructor(
    private readonly telegramLinkTokens: TelegramLinkTokenRepository,
    private readonly clock: Clock
  ) {}

  async execute(chatId: string) {
    const token = randomUUID();
    const expiresAt = new Date(this.clock.now().getTime() + 15 * 60 * 1000);
    await this.telegramLinkTokens.create({ token, chatId, expiresAt });
    return { token, expiresAt: expiresAt.toISOString() };
  }
}

export class ConsumeTelegramLinkTokenUseCase {
  constructor(
    private readonly telegramLinkTokens: TelegramLinkTokenRepository,
    private readonly users: UserRepository,
    private readonly tokens: TokenService,
    private readonly clock: Clock
  ) {}

  async execute(token: string) {
    const record = await this.telegramLinkTokens.consume(token, this.clock.now());
    if (!record) throw new Error('Invalid or expired link token.');
    const linkedUser = await this.users.findByTelegramChatId(record.chatId);
    if (linkedUser) {
      return {
        telegramChatId: record.chatId,
        phoneNumber: linkedUser.phoneNumber,
        linkedUser: true,
        user: linkedUser,
        accessToken: this.tokens.signAccessToken(linkedUser),
        refreshToken: this.tokens.signRefreshToken(linkedUser)
      };
    }

    return {
      telegramChatId: record.chatId,
      phoneNumber: undefined,
      linkedUser: false
    };
  }
}

export class VerifyOtpUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly otps: OtpRepository,
    private readonly categories: CategoryRepository,
    private readonly tokens: TokenService,
    private readonly clock: Clock,
    private readonly messaging: MessagingProvider,
    private readonly options: { frontendPublicOrigin: string }
  ) {}

  async execute(input: { phoneNumber: string; code: string; firstName?: string; lastName?: string; preferredName?: string; email?: string; countryOfResidence?: string; preferredCurrency?: string; preferredLanguage?: 'es' | 'en'; telegramChatId?: string }) {
    const verified = await this.otps.verify(input.phoneNumber, input.code, this.clock.now());
    if (!verified) {
      throw new Error('Invalid or expired OTP.');
    }

    const existingUser = await this.users.findByPhoneNumber(input.phoneNumber);
    if (existingUser) {
      if (input.telegramChatId && input.telegramChatId !== existingUser.telegramChatId) {
        await this.users.linkTelegramChatByPhone(existingUser.phoneNumber, input.telegramChatId);
      }
      await this.categories.ensureDefaults(existingUser.tenantId);
      return {
        user: existingUser,
        accessToken: this.tokens.signAccessToken(existingUser),
        refreshToken: this.tokens.signRefreshToken(existingUser)
      };
    }

    if (!input.firstName || !input.lastName || !input.preferredName || !input.email || !input.countryOfResidence || !input.preferredCurrency) {
      throw new Error('Registration details are required for new users.');
    }

    const user = await this.users.upsertByPhoneNumber({
      phoneNumber: input.phoneNumber,
      firstName: input.firstName,
      lastName: input.lastName,
      preferredName: input.preferredName,
      email: input.email,
      countryOfResidence: input.countryOfResidence,
      preferredCurrency: input.preferredCurrency,
      preferredLanguage: input.preferredLanguage ?? 'es'
    });
    await this.categories.ensureDefaults(user.tenantId);
    if (input.telegramChatId) {
      await this.users.linkTelegramChatByPhone(user.phoneNumber, input.telegramChatId);
      await this.messaging.sendText(
        input.telegramChatId,
        buildRegistrationGreeting(
          user.preferredLanguage ?? 'es',
          user.preferredName,
          this.options.frontendPublicOrigin
        ),
        { channel: 'telegram' }
      );
    }

    return {
      user,
      accessToken: this.tokens.signAccessToken(user),
      refreshToken: this.tokens.signRefreshToken(user)
    };
  }
}

function buildOtpMessage(language: 'es' | 'en', code: string) {
  if (language === 'es') {
    return `Tu codigo de verificacion de Expenses Tracker es ${code}. Expira en 10 minutos.`;
  }

  return `Your Expenses Tracker verification code is ${code}. It expires in 10 minutes.`;
}

function buildRegistrationGreeting(language: 'es' | 'en', preferredName: string, frontendPublicOrigin: string) {
  const dashboardUrl = `${frontendPublicOrigin.replace(/\/$/, '')}/dashboard`;

  if (language === 'es') {
    return [
      `${preferredName}, tu cuenta ya quedó lista.`,
      '',
      'Cuéntame tu ingreso de este mes y los gastos a medida que vayan ocurriendo. Yo los iré registrando por ti.',
      '',
      'Ejemplos:',
      '- 20.000 clases en Bsoul, transferencia desde BCI',
      '- 25.000 polera en Paris, tarjeta de credito BCI',
      '- Ingreso de sueldo 1.200.000, transferencia',
      '- Cuanto gaste este mes?',
      '- Enviame mi reporte mensual',
      '',
      'Usaré la moneda de tu perfil, así que no necesitas escribirla en cada mensaje.',
      '',
      `Puedes ver tu dashboard aquí: ${dashboardUrl}`
    ].join('\n');
  }

  return [
    `${preferredName}, your account is ready.`,
    '',
    'Send me this month’s income and the expenses as they happen. I will keep them tracked for you.',
    '',
    'Examples:',
    '- 20.000 classes at Bsoul, transfer from BCI',
    '- 25.000 shirt at Paris, credit card BCI',
    '- Salary income 1.200.000, bank transfer',
    '- How much did I spend this month?',
    '- Send me my monthly report',
    '',
    'I will use the currency from your profile, so you do not need to include it in every message.',
    '',
    `You can open your dashboard here: ${dashboardUrl}`
  ].join('\n');
}

export class RefreshSessionUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly tokens: TokenService
  ) {}

  async execute(refreshToken: string) {
    const payload = this.tokens.verifyRefreshToken(refreshToken);
    const user = await this.users.findById(payload.userId);
    if (!user || user.tenantId !== payload.tenantId) {
      throw new Error('Invalid refresh token.');
    }

    return {
      user,
      accessToken: this.tokens.signAccessToken(user),
      refreshToken: this.tokens.signRefreshToken(user)
    };
  }
}
