import * as Sentry from '@sentry/nestjs';
// Ensure to call this before requiring any other modules!
const sentryDsn = process.env.SENTRY_DSN;

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
  });
}
