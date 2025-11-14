import * as Sentry from '@sentry/nestjs';

// Ensure to call this before requiring any other modules!
const sentryDsn = process.env.SENTRY_DSN;
const environment = process.env.NODE_ENV || 'development';

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment,
    // Performance Monitoring - sample 100% in dev, 10% in prod
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
  });

  console.log(`✅ Sentry initialized for environment: ${environment}`);
} else {
  console.warn('⚠️  SENTRY_DSN not configured - error tracking disabled');
}
