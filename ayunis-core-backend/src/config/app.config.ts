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

export const appConfig = registerAs('app', () => ({
  port: process.env.PORT || 3000,
  disableRegistration: process.env.DISABLE_REGISTRATION === 'true',
  isSelfHosted: process.env.APP_ENVIRONMENT === 'self-hosted',
  isCloudHosted: process.env.APP_ENVIRONMENT === 'cloud',
  frontend: frontendConfig(),
  orgEventsWebhookUrl: process.env.ORG_EVENTS_WEBHOOK_URL,
  isDevelopment: process.env.NODE_ENV === 'development',
  isTest: process.env.NODE_ENV === 'test',
  isProduction: process.env.APP_ENVIRONMENT === 'production',
}));
