import { registerAs } from '@nestjs/config';

function frontendConfig() {
  return {
    baseUrl: process.env.FRONTEND_BASEURL || 'http://localhost:3001',
    emailConfirmEndpoint:
      process.env.EMAIL_CONFIRM_ENDPOINT || '/confirm-email',
    passwordResetEndpoint:
      process.env.PASSWORD_RESET_ENDPOINT || '/password/reset',
    accountActivateEndpoint:
      process.env.ACCOUNT_ACTIVATE_ENDPOINT || '/account/activate',
    forgotPasswordEndpoint:
      process.env.FORGOT_PASSWORD_ENDPOINT || '/password/forgot',
    inviteAcceptEndpoint:
      process.env.INVITE_ACCEPT_ENDPOINT || '/accept-invite',
    emailAssetsPath: process.env.EMAIL_ASSETS_PATH || '/email',
  };
}

export const appConfig = registerAs('app', () => {
  // Treat unset/blank NODE_ENV like development (matches logger, AppSignal, seed scripts).
  const nodeEnv = (process.env.NODE_ENV ?? '').trim() || 'development';
  const orgEventsWebhookUrl =
    process.env.DISABLE_ORG_EVENTS_WEBHOOKS === 'true'
      ? undefined
      : process.env.ORG_EVENTS_WEBHOOK_URL;

  if (nodeEnv === 'production' && process.env.MOCK_INFERENCE === 'true') {
    throw new Error('MOCK_INFERENCE must not be enabled in production');
  }

  return {
    port: process.env.PORT || 3000,
    disableRegistration: process.env.DISABLE_REGISTRATION === 'true',
    isSelfHosted: process.env.APP_ENVIRONMENT === 'self-hosted',
    isCloudHosted: process.env.APP_ENVIRONMENT === 'cloud',
    frontend: frontendConfig(),
    orgEventsWebhookUrl,
    webhookSigningSecret: process.env.WEBHOOK_SIGNING_SECRET,
    isDevelopment: nodeEnv === 'development',
    isTest: nodeEnv === 'test',
    isProduction: nodeEnv === 'production',
    // Replaces all LLM provider handlers with deterministic mocks (e2e stacks).
    mockInference: nodeEnv === 'test' || process.env.MOCK_INFERENCE === 'true',
  };
});
