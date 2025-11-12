import { createLogger, format, transports } from 'winston';
import Transport from 'winston-transport';
import * as Sentry from '@sentry/nestjs';

const isDevelopment = process.env.NODE_ENV !== 'production';
const hasSentry = !!process.env.SENTRY_DSN;

function createConsoleFormat() {
  if (isDevelopment) {
    // Development: verbose, colorful, human-readable
    return format.combine(
      format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      format.errors({ stack: true }),
      format.colorize({ all: true }),
      format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length
          ? `\n${JSON.stringify(meta, null, 2)}`
          : '';
        return `${timestamp} [${level}]: ${message}${metaStr}`;
      }),
    );
  } else {
    // Production: structured JSON for log aggregation
    return format.combine(
      format.timestamp(),
      format.errors({ stack: true }),
      format.json(),
    );
  }
}

function createTransports() {
  const transportList: Transport[] = [
    new transports.Console({
      format: createConsoleFormat(),
    }),
  ];

  // Add Sentry transport only if configured
  if (hasSentry) {
    const SentryWinstonTransport =
      Sentry.createSentryWinstonTransport(Transport);
    transportList.push(new SentryWinstonTransport());
  }

  return transportList;
}

export const logger = createLogger({
  level: isDevelopment ? 'debug' : 'info',
  transports: createTransports(),
});
