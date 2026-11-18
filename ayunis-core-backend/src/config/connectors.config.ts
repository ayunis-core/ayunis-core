import { registerAs } from '@nestjs/config';

const MICROSOFT_LOGIN_URL = 'https://login.microsoftonline.com';

export const connectorsConfig = registerAs('connectors', () => ({
  // Only overridden to point the e2e backend at a stand-in for Microsoft Entra.
  microsoftLoginOrigin: new URL(
    process.env.MICROSOFT_LOGIN_URL?.trim() || MICROSOFT_LOGIN_URL,
  ).origin,
}));
