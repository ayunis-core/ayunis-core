import { registerAs } from '@nestjs/config';

function getMcpOAuthStateSecret(): string {
  const secret = process.env.MCP_OAUTH_STATE_SECRET;
  if (secret) return secret;

  const env = process.env.NODE_ENV;
  if (env === 'development' || env === 'test') {
    return 'dev-mcp-oauth-state-secret';
  }

  throw new Error(
    'MCP_OAUTH_STATE_SECRET environment variable is not configured. ' +
      'Set a strong random secret for signing OAuth state tokens.',
  );
}

export const appConfig = registerAs('app', () => ({
  backend: {
    baseUrl: process.env.BACKEND_BASEURL ?? 'http://localhost:3000',
  },
  mcp: {
    oauthStateSecret: getMcpOAuthStateSecret(),
  },
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
  },
  orgEventsWebhookUrl: process.env.ORG_EVENTS_WEBHOOK_URL,
  isDevelopment: process.env.NODE_ENV === 'development',
  isTest: process.env.NODE_ENV === 'test',
  isProduction: process.env.APP_ENVIRONMENT === 'production',
}));
