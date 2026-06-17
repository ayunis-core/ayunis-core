import * as Sentry from '@sentry/nestjs';
import { HttpException } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ApplicationError } from '../errors/base.error';

// Ensure to call this before requiring any other modules!
const sentryDsn = process.env.SENTRY_DSN;
const environment = process.env.NODE_ENV ?? 'development';
const release = process.env.SENTRY_RELEASE ?? readPackageVersion();

function readPackageVersion(): string | undefined {
  try {
    const pkg = JSON.parse(
      readFileSync(join(process.cwd(), 'package.json'), 'utf-8'),
    ) as { version?: string };
    return pkg.version;
  } catch {
    return undefined;
  }
}

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment,
    release,
    enableLogs: true,
    // Performance Monitoring - sample 100% in dev, 10% in prod
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
    beforeSend(event, hint) {
      const error = hint.originalException;

      // Drop 4xx ApplicationErrors — expected client errors (bad input, auth
      // failures, etc.) that are already captured in structured logs.
      if (error instanceof ApplicationError && error.statusCode < 500) {
        return null;
      }

      // Drop 4xx NestJS HttpExceptions (validation errors, 404s, etc.)
      if (error instanceof HttpException && error.getStatus() < 500) {
        return null;
      }

      return event;
    },
  });

  console.warn(`✅ Sentry initialized for environment: ${environment}`);
} else {
  console.warn('⚠️  SENTRY_DSN not configured - error tracking disabled');
}
