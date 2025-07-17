import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  port: process.env.PORT || 3000,
  disableRegistration: process.env.DISABLE_REGISTRATION === 'true',
  isSelfHosted: process.env.APP_ENVIRONMENT === 'self-hosted',
  isCloudHosted: process.env.APP_ENVIRONMENT === 'cloud',
  frontend: {
    baseUrl: process.env.FRONTEND_URL || 'http://localhost:3001',
    emailConfirmEndpoint:
      process.env.EMAIL_CONFIRM_ENDPOINT || '/confirm-email',
  },
  disableEmailConfirmation: process.env.DISABLE_EMAIL_CONFIRMATION === 'true',
}));
