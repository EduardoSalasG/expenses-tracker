import { randomUUID } from 'node:crypto';
import type { CategoryRepository, Clock, EmailMagicLinkTokenRepository, EmailProvider, MessagingProvider, OtpRepository, PasswordHasher, TelegramLinkTokenRepository, TokenService, UserRepository } from '../ports.js';

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
    const targetChatId = existingUser?.telegramChatId ?? input.telegramChatId;
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

  async execute(chatId: string, phoneNumber?: string) {
    const token = randomUUID();
    const expiresAt = new Date(this.clock.now().getTime() + 15 * 60 * 1000);
    await this.telegramLinkTokens.create({ token, chatId, phoneNumber, expiresAt });
    return { token, expiresAt: expiresAt.toISOString() };
  }
}

export class CreateTelegramRegistrationLinkUseCase {
  constructor(
    private readonly tokens: TokenService,
    private readonly options: { telegramBotUsername: string }
  ) {}

  async execute(phoneNumber: string) {
    if (!this.options.telegramBotUsername) {
      throw new Error('Telegram bot username is not configured.');
    }

    const token = this.tokens.signTelegramRegistrationIntent(phoneNumber);
    return {
      phoneNumber,
      botUrl: `https://t.me/${this.options.telegramBotUsername}?start=${encodeURIComponent(token)}`
    };
  }
}

export class RequestEmailMagicLinkUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly emailMagicLinks: EmailMagicLinkTokenRepository,
    private readonly email: EmailProvider,
    private readonly clock: Clock,
    private readonly options: { frontendPublicOrigin: string }
  ) {}

  async execute(phoneNumber: string) {
    const user = await this.users.findByPhoneNumber(phoneNumber);
    if (!user) {
      throw new Error('No account found for that phone number.');
    }

    if (!user.email) {
      throw new Error('This account has no email configured. Sign in with your password and add an email in Settings first.');
    }

    const token = randomUUID();
    const expiresAt = new Date(this.clock.now().getTime() + 15 * 60 * 1000);
    await this.emailMagicLinks.create({ token, userId: user.id, expiresAt });

    const loginUrl = `${this.options.frontendPublicOrigin.replace(/\/$/, '')}/login?magicLinkToken=${encodeURIComponent(token)}`;
    await this.email.send({
      to: user.email,
      subject: 'Your Expenses Tracker access link',
      text: buildMagicLinkText(user.preferredName, loginUrl),
      html: buildMagicLinkHtml(user.preferredName, loginUrl)
    });

    return {
      sent: true,
      expiresAt: expiresAt.toISOString(),
      email: maskEmail(user.email)
    };
  }
}

export class ConsumeEmailMagicLinkUseCase {
  constructor(
    private readonly emailMagicLinks: EmailMagicLinkTokenRepository,
    private readonly users: UserRepository,
    private readonly tokens: TokenService,
    private readonly clock: Clock
  ) {}

  async execute(token: string) {
    const record = await this.emailMagicLinks.consume(token, this.clock.now());
    if (!record) {
      throw new Error('Invalid or expired magic link token.');
    }

    const user = await this.users.findById(record.userId);
    if (!user) {
      throw new Error('Invalid or expired magic link token.');
    }

    return {
      user,
      accessToken: this.tokens.signAccessToken(user),
      refreshToken: this.tokens.signRefreshToken(user)
    };
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
        phoneNumber: record.phoneNumber ?? linkedUser.phoneNumber,
        linkedUser: true,
        user: linkedUser,
        accessToken: this.tokens.signAccessToken(linkedUser),
        refreshToken: this.tokens.signRefreshToken(linkedUser)
      };
    }

    return {
      telegramChatId: record.chatId,
      phoneNumber: record.phoneNumber,
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

function buildMagicLinkText(preferredName: string, loginUrl: string) {
  return [
    `${preferredName}, here is your access link for Expenses Tracker.`,
    '',
    'Use it within the next 15 minutes:',
    loginUrl,
    '',
    'If you did not request this email, you can ignore it.'
  ].join('\n');
}

function buildMagicLinkHtml(preferredName: string, loginUrl: string) {
  return [
    `<p>${escapeHtml(preferredName)}, here is your access link for <strong>Expenses Tracker</strong>.</p>`,
    `<p><a href="${escapeHtml(loginUrl)}">Open my account</a></p>`,
    '<p>This link expires in 15 minutes.</p>',
    '<p>If you did not request this email, you can ignore it.</p>'
  ].join('');
}

function maskEmail(email: string) {
  const [localPart, domain] = email.split('@');
  if (!localPart || !domain) return email;
  const visible = localPart.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(localPart.length - 2, 2))}@${domain}`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export class RegisterWebUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly categories: CategoryRepository,
    private readonly passwords: PasswordHasher,
    private readonly tokens: TokenService
  ) {}

  async execute(input: {
    phoneNumber: string;
    password: string;
    firstName: string;
    lastName: string;
    preferredName: string;
    email?: string;
    countryOfResidence: string;
    preferredCurrency: string;
    preferredLanguage?: 'es' | 'en';
    telegramChatId?: string;
  }) {
    const existingUser = await this.users.findByPhoneNumber(input.phoneNumber);
    if (existingUser) {
      throw new Error('Phone number is already registered. Please log in.');
    }

    const user = await this.users.upsertByPhoneNumber({
      phoneNumber: input.phoneNumber,
      firstName: input.firstName,
      lastName: input.lastName,
      preferredName: input.preferredName,
      email: input.email,
      countryOfResidence: input.countryOfResidence,
      preferredCurrency: input.preferredCurrency,
      preferredLanguage: input.preferredLanguage ?? 'es',
      telegramChatId: undefined,
      telegramUsername: undefined
    });
    await this.users.setPasswordHash(user.id, await this.passwords.hash(input.password));
    await this.categories.ensureDefaults(user.tenantId);
    if (input.telegramChatId) {
      await this.users.linkTelegramChatByPhone(user.phoneNumber, input.telegramChatId);
    }

    return {
      user,
      accessToken: this.tokens.signAccessToken(user),
      refreshToken: this.tokens.signRefreshToken(user)
    };
  }
}

export class LoginWebUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly passwords: PasswordHasher,
    private readonly tokens: TokenService
  ) {}

  async execute(input: {
    phoneNumber: string;
    password: string;
    telegramChatId?: string;
  }) {
    const authRecord = await this.users.findAuthByPhoneNumber(input.phoneNumber);
    if (!authRecord?.passwordHash) {
      throw new Error('Invalid phone number or password.');
    }

    const isValid = await this.passwords.verify(input.password, authRecord.passwordHash);
    if (!isValid) {
      throw new Error('Invalid phone number or password.');
    }

    let user = authRecord.user;
    if (input.telegramChatId && input.telegramChatId !== user.telegramChatId) {
      user = (await this.users.linkTelegramChatByPhone(user.phoneNumber, input.telegramChatId)) ?? user;
    }

    return {
      user,
      accessToken: this.tokens.signAccessToken(user),
      refreshToken: this.tokens.signRefreshToken(user)
    };
  }
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
