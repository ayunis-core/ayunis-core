import { createLogger, format, transports } from 'winston';
import { AppsignalLogTransport } from './appsignal-log.transport';

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

// AppSignal error reporting is handled by setError() in the
// ApplicationErrorFilter (exception pipeline), not via a Winston transport.
// This avoids duplicate events when logger.error() is followed by a thrown
// exception that the filter also captures.
//
// AppSignal *Logging* (structured log product, separate from Errors) is fed
// in production via AppsignalLogTransport so that every this.logger.log/warn/…
// call automatically appears in AppSignal Logs.
export const logger = createLogger({
  level: isDevelopment ? 'debug' : 'info',
  transports: [
    new transports.Console({
      format: createConsoleFormat(),
    }),
    ...buildAppsignalTransport(),
  ],
});

function buildAppsignalTransport(): AppsignalLogTransport[] {
  if (isDevelopment || !process.env.APPSIGNAL_PUSH_API_KEY) {
    return [];
  }

  return [
    new AppsignalLogTransport({
      group: 'app',
      // Only forward info+ to AppSignal to avoid noise
      level: 'info',
    }),
  ];
}
