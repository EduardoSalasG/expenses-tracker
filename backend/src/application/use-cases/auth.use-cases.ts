import type { CategoryRepository, Clock, MessagingProvider, OtpRepository, TokenService, UserRepository } from '../ports.js';

export class RequestOtpUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly otps: OtpRepository,
    private readonly messaging: MessagingProvider,
    private readonly clock: Clock,
    private readonly options: { exposeOtpInResponse: boolean } = { exposeOtpInResponse: false }
  ) {}

  async execute(phoneNumber: string) {
    const existingUser = await this.users.findByPhoneNumber(phoneNumber);
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(this.clock.now().getTime() + 10 * 60 * 1000);
    await this.otps.create(phoneNumber, code, expiresAt);
    await this.messaging.sendText(phoneNumber, buildOtpMessage(existingUser?.preferredLanguage ?? 'es', code));
    return {
      sent: true,
      requiresRegistration: !existingUser,
      ...(this.options.exposeOtpInResponse ? { debugCode: code } : {})
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
    private readonly messaging: MessagingProvider
  ) {}

  async execute(input: { phoneNumber: string; code: string; firstName?: string; lastName?: string; preferredName?: string; email?: string; countryOfResidence?: string; preferredCurrency?: string; preferredLanguage?: 'es' | 'en' }) {
    const verified = await this.otps.verify(input.phoneNumber, input.code, this.clock.now());
    if (!verified) {
      throw new Error('Invalid or expired OTP.');
    }

    const existingUser = await this.users.findByPhoneNumber(input.phoneNumber);
    if (existingUser) {
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
    await this.messaging.sendText(user.phoneNumber, buildRegistrationGreeting(user.preferredLanguage ?? 'es', user.preferredName));

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

function buildRegistrationGreeting(language: 'es' | 'en', preferredName: string) {
  if (language === 'es') {
    return [
      `Hola ${preferredName}, bienvenido a Expenses Tracker.`,
      '',
      'Ya puedes enviar mensajes en lenguaje natural para registrar tus finanzas.',
      '',
      'Ejemplos:',
      '- 20.000 clases en Bsoul, transferencia desde BCI',
      '- 25.000 polera en Paris, tarjeta de credito BCI',
      '- Ingreso de sueldo 1.200.000, transferencia',
      '- Cuanto gaste este mes?',
      '- Enviame mi reporte mensual',
      '',
      'Usaremos tu moneda preferida del perfil. No necesitas escribirla en cada mensaje.'
    ].join('\n');
  }

  return [
    `Hi ${preferredName}, welcome to Expenses Tracker.`,
    '',
    'You can now send natural messages to track your finances.',
    '',
    'Examples:',
    '- 20.000 classes at Bsoul, transfer from BCI',
    '- 25.000 shirt at Paris, credit card BCI',
    '- Salary income 1.200.000, bank transfer',
    '- How much did I spend this month?',
    '- Send me my monthly report',
    '',
    'Use your preferred currency from your profile. You do not need to write the currency in each message.'
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
