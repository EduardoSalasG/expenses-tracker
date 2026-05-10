import 'dotenv/config';
import { z } from 'zod';

const booleanEnvSchema = z.preprocess((value) => {
  if (typeof value !== 'string') return value;
  if (['true', '1', 'yes', 'on'].includes(value.toLowerCase())) return true;
  if (['false', '0', 'no', 'off'].includes(value.toLowerCase())) return false;
  return value;
}, z.boolean());

const optionalNumberEnvSchema = (defaultValue: number) => z.preprocess((value) => {
  if (value === undefined || value === '') return defaultValue;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}, z.number());

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().default('postgres://postgres:postgres@localhost:5432/expenses_tracker'),
  JWT_SECRET: z.string().min(8).default('change-me-local-secret'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRES_IN_DAYS: z.coerce.number().default(30),
  WHATSAPP_VERIFY_TOKEN: z.string().default('local-verify-token'),
  WHATSAPP_APP_SECRET: z.string().default(''),
  WHATSAPP_ACCESS_TOKEN: z.string().default(''),
  WHATSAPP_PHONE_NUMBER_ID: z.string().default(''),
  WHATSAPP_BUSINESS_ACCOUNT_ID: z.string().default(''),
  WHATSAPP_TEST_RECIPIENT_PHONE: z.string().default(''),
  MESSAGE_INTERPRETER_PROVIDER: z.enum(['deterministic', 'openai-compatible', 'github-models']).default('deterministic'),
  MESSAGE_INTERPRETER_API_KEY: z.string().default(''),
  MESSAGE_INTERPRETER_BASE_URL: z.string().url().default('https://models.github.ai/inference'),
  MESSAGE_INTERPRETER_MODEL: z.string().default('deepseek/DeepSeek-V3-0324'),
  MESSAGE_INTERPRETER_TEMPERATURE: optionalNumberEnvSchema(0.1).pipe(z.number().min(0).max(2)),
  OTP_DEBUG_RESPONSE_ENABLED: booleanEnvSchema.default(false),
  FRONTEND_ORIGIN: z.string().default('http://localhost:4200'),
  USE_IN_MEMORY_REPOSITORIES: booleanEnvSchema.default(false)
});

export type AppConfig = ReturnType<typeof loadConfig>;

export function loadConfig() {
  const env = envSchema.parse(process.env);

  return {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    databaseUrl: env.DATABASE_URL,
    jwtSecret: env.JWT_SECRET,
    jwtExpiresIn: env.JWT_EXPIRES_IN,
    refreshTokenExpiresInDays: env.REFRESH_TOKEN_EXPIRES_IN_DAYS,
    whatsappVerifyToken: env.WHATSAPP_VERIFY_TOKEN,
    whatsappAppSecret: env.WHATSAPP_APP_SECRET,
    whatsappAccessToken: env.WHATSAPP_ACCESS_TOKEN,
    whatsappPhoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID,
    whatsappBusinessAccountId: env.WHATSAPP_BUSINESS_ACCOUNT_ID,
    whatsappTestRecipientPhone: env.WHATSAPP_TEST_RECIPIENT_PHONE,
    messageInterpreterProvider: env.MESSAGE_INTERPRETER_PROVIDER,
    messageInterpreterApiKey: env.MESSAGE_INTERPRETER_API_KEY,
    messageInterpreterBaseUrl: env.MESSAGE_INTERPRETER_BASE_URL,
    messageInterpreterModel: env.MESSAGE_INTERPRETER_MODEL,
    messageInterpreterTemperature: env.MESSAGE_INTERPRETER_TEMPERATURE,
    otpDebugResponseEnabled: env.OTP_DEBUG_RESPONSE_ENABLED,
    frontendOrigin: env.FRONTEND_ORIGIN,
    useInMemoryRepositories: env.USE_IN_MEMORY_REPOSITORIES
  };
}
