import winston from 'winston';
import { loadConfig, type AppConfig } from './config.js';
import { APP_VERSION } from './generated/app-version.js';

type LoggerConfig = Pick<AppConfig, 'nodeEnv' | 'logLevel'>;

export function createLogger(config: LoggerConfig = loadConfig()) {
  return winston.createLogger({
    level: config.logLevel,
    defaultMeta: {
      service: 'expenses-tracker-api',
      environment: config.nodeEnv,
      version: APP_VERSION
    },
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format((info) => {
        if (config.nodeEnv === 'production') delete info.stack;
        return info;
      })(),
      winston.format.json()
    ),
    transports: [new winston.transports.Console()]
  });
}

export type AppLogger = ReturnType<typeof createLogger>;
