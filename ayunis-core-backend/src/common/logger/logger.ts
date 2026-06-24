import { createLogger, format, transports } from 'winston';
import { SentryLogTransport } from './sentry-log.transport';

const isDevelopment = process.env.NODE_ENV !== 'production';

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
        return `${String(timestamp)} [${String(level)}]: ${String(message)}${metaStr}`;
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

// Sentry error reporting is handled by @SentryExceptionCaptured() on the
// ApplicationErrorFilter (exception pipeline), not via a Winston transport.
// This avoids duplicate events when logger.error() is followed by a thrown
// exception that the filter also captures.
//
// Sentry *Logs* (structured log product, separate from Issues) are forwarded
// in production via SentryLogTransport so that every this.logger.log/warn/…
// call automatically appears in Sentry Logs, linked to traces.
export const logger = createLogger({
  level: isDevelopment ? 'debug' : 'info',
  transports: [
    new transports.Console({
      format: createConsoleFormat(),
    }),
    ...buildSentryTransport(),
  ],
});

function buildSentryTransport(): SentryLogTransport[] {
  if (isDevelopment || !process.env.SENTRY_DSN) {
    return [];
  }

  return [
    new SentryLogTransport({
      // Only forward info+ to Sentry to avoid noise
      level: 'info',
    }),
  ];
}
