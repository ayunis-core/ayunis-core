import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  port: process.env.PORT || 3000,
  disableRegistration: process.env.DISABLE_REGISTRATION === 'true',
  isSelfHosted: process.env.APP_ENVIRONMENT === 'self-hosted',
  isCloudHosted: process.env.APP_ENVIRONMENT === 'cloud',
  frontend: {
    baseUrl: process.env.FRONTEND_BASEURL || 'http://localhost:3001',
    emailConfirmEndpoint:
      process.env.EMAIL_CONFIRM_ENDPOINT || '/confirm-email',
    passwordResetEndpoint:
      process.env.PASSWORD_RESET_ENDPOINT || '/password/reset',
    forgotPasswordEndpoint:
      process.env.FORGOT_PASSWORD_ENDPOINT || '/password/forgot',
    inviteAcceptEndpoint:
      process.env.INVITE_ACCEPT_ENDPOINT || '/accept-invite',
    chatEndpoint: process.env.CHAT_ENDPOINT || '/chat',
    marketplaceEndpoint: process.env.MARKETPLACE_ENDPOINT || '/marketplace',
    knowledgeEndpoint: process.env.KNOWLEDGE_ENDPOINT || '/knowledge',
    emailAssetsPath: process.env.EMAIL_ASSETS_PATH || '/email',
  },
  orgEventsWebhookUrl: process.env.ORG_EVENTS_WEBHOOK_URL,
  isDevelopment: process.env.NODE_ENV === 'development',
  isTest: process.env.NODE_ENV === 'test',
  isProduction: process.env.APP_ENVIRONMENT === 'production',
}));
