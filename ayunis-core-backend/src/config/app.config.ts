import { registerAs } from '@nestjs/config';

function envOrDefault(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

function buildFrontendConfig() {
  return {
    baseUrl: envOrDefault('FRONTEND_BASEURL', 'http://localhost:3001'),
    emailConfirmEndpoint: envOrDefault(
      'EMAIL_CONFIRM_ENDPOINT',
      '/confirm-email',
    ),
    passwordResetEndpoint: envOrDefault(
      'PASSWORD_RESET_ENDPOINT',
      '/password/reset',
    ),
    forgotPasswordEndpoint: envOrDefault(
      'FORGOT_PASSWORD_ENDPOINT',
      '/password/forgot',
    ),
    inviteAcceptEndpoint: envOrDefault(
      'INVITE_ACCEPT_ENDPOINT',
      '/accept-invite',
    ),
  };
}

function buildEnvironmentFlags() {
  const appEnvironment = process.env.APP_ENVIRONMENT;
  const nodeEnv = process.env.NODE_ENV;
  return {
    isSelfHosted: appEnvironment === 'self-hosted',
    isCloudHosted: appEnvironment === 'cloud',
    isDevelopment: nodeEnv === 'development',
    isTest: nodeEnv === 'test',
    isProduction: appEnvironment === 'production',
  };
}

export const appConfig = registerAs('app', () => ({
  port: process.env.PORT ?? 3000,
  disableRegistration: process.env.DISABLE_REGISTRATION === 'true',
  frontend: buildFrontendConfig(),
  orgEventsWebhookUrl: process.env.ORG_EVENTS_WEBHOOK_URL,
  webhookSigningSecret: process.env.WEBHOOK_SIGNING_SECRET,
  ...buildEnvironmentFlags(),
}));
