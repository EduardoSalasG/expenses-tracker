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
      text: buildMagicLinkText(user.preferredLanguage ?? 'es', user.preferredName, loginUrl),
      html: buildMagicLinkHtml(user.preferredLanguage ?? 'es', user.preferredName, loginUrl)
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

function buildMagicLinkText(language: 'es' | 'en', preferredName: string, loginUrl: string) {
  if (language === 'es') {
    return [
      `${preferredName}, aquí tienes tu enlace de acceso a Expenses Tracker.`,
      '',
      'Úsalo dentro de los próximos 15 minutos:',
      loginUrl,
      '',
      'Si no solicitaste este correo, puedes ignorarlo.'
    ].join('\n');
  }

  return [
    `${preferredName}, here is your access link for Expenses Tracker.`,
    '',
    'Use it within the next 15 minutes:',
    loginUrl,
    '',
    'If you did not request this email, you can ignore it.'
  ].join('\n');
}

function buildMagicLinkHtml(language: 'es' | 'en', preferredName: string, loginUrl: string) {
  const copy = language === 'es'
    ? {
        preheader: 'Tu enlace de acceso a Expenses Tracker',
        greeting: `${preferredName}, aquí tienes tu enlace de acceso.`,
        description: 'Abre tu cuenta con un solo clic. Este enlace estará disponible durante 15 minutos.',
        cta: 'Abrir mi cuenta',
        fallback: 'Si el botón no funciona, copia y pega este enlace en tu navegador:',
        expiry: 'Este enlace vence en 15 minutos.',
        ignore: 'Si no solicitaste este correo, puedes ignorarlo.',
        signoff: 'Expenses Tracker',
        eyebrow: 'ACCESO SEGURO'
      }
    : {
        preheader: 'Your Expenses Tracker access link',
        greeting: `${preferredName}, here is your access link.`,
        description: 'Open your account in one click. This link will be available for 15 minutes.',
        cta: 'Open my account',
        fallback: 'If the button does not work, copy and paste this link into your browser:',
        expiry: 'This link expires in 15 minutes.',
        ignore: 'If you did not request this email, you can ignore it.',
        signoff: 'Expenses Tracker',
        eyebrow: 'SECURE ACCESS'
      };
  const safeName = escapeHtml(preferredName);
  const safeUrl = escapeHtml(loginUrl);

  return `<!doctype html>
<html lang="${language}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Expenses Tracker</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f6fb;color:#0f172a;font-family:Inter,Segoe UI,Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(copy.preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#f3f6fb;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;max-width:560px;">
            <tr>
              <td style="padding-bottom:16px;">
                <div style="display:inline-flex;align-items:center;gap:12px;">
                  <div style="width:44px;height:44px;border-radius:12px;background:#2f5be7;color:#ffffff;font-size:22px;font-weight:700;line-height:44px;text-align:center;">ET</div>
                  <div>
                    <div style="margin:0;color:#0f172a;font-size:20px;font-weight:700;">Expenses Tracker</div>
                    <div style="margin-top:2px;color:#64748b;font-size:12px;letter-spacing:0.08em;">${escapeHtml(copy.eyebrow)}</div>
                  </div>
                </div>
              </td>
            </tr>
            <tr>
              <td style="background:#ffffff;border:1px solid #d7deea;border-radius:20px;padding:32px;">
                <div style="color:#2f5be7;font-size:12px;font-weight:700;letter-spacing:0.08em;margin-bottom:14px;">${escapeHtml(copy.eyebrow)}</div>
                <h1 style="margin:0 0 12px;color:#0f172a;font-size:28px;line-height:1.2;font-weight:700;">${safeName}</h1>
                <p style="margin:0 0 24px;color:#475569;font-size:16px;line-height:1.6;">${escapeHtml(copy.greeting)} ${escapeHtml(copy.description)}</p>
                <table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:0 0 24px;">
                  <tr>
                    <td style="border-radius:999px;background:#2f5be7;">
                      <a href="${safeUrl}" style="display:inline-block;padding:14px 24px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;">${escapeHtml(copy.cta)}</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 8px;color:#0f172a;font-size:14px;font-weight:600;">${escapeHtml(copy.fallback)}</p>
                <p style="margin:0 0 20px;word-break:break-all;">
                  <a href="${safeUrl}" style="color:#2f5be7;text-decoration:none;font-size:14px;line-height:1.6;">${safeUrl}</a>
                </p>
                <div style="height:1px;background:#e2e8f0;margin:0 0 20px;"></div>
                <p style="margin:0 0 6px;color:#475569;font-size:14px;line-height:1.6;">${escapeHtml(copy.expiry)}</p>
                <p style="margin:0;color:#64748b;font-size:14px;line-height:1.6;">${escapeHtml(copy.ignore)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 4px 0;color:#64748b;font-size:12px;line-height:1.6;text-align:center;">
                ${escapeHtml(copy.signoff)}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
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
