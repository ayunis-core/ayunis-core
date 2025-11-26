import * as Sentry from '@sentry/react';

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;

  if (import.meta.env.PROD && dsn) {
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE as string,
      integrations: [Sentry.browserTracingIntegration()],
      tracesSampleRate: 0.1, // 10% of transactions
    });
  }
}

export { Sentry };
