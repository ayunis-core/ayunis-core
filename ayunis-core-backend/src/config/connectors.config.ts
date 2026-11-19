import { registerAs } from '@nestjs/config';

const MICROSOFT_LOGIN_URL = 'https://login.microsoftonline.com';
const MICROSOFT_GRAPH_URL = 'https://graph.microsoft.com';

export const connectorsConfig = registerAs('connectors', () => ({
  // Only overridden to point the e2e backend at stand-ins for Microsoft
  // Entra and Microsoft Graph.
  microsoftLoginOrigin: new URL(
    process.env.MICROSOFT_LOGIN_URL?.trim() || MICROSOFT_LOGIN_URL,
  ).origin,
  microsoftGraphOrigin: new URL(
    process.env.MICROSOFT_GRAPH_URL?.trim() || MICROSOFT_GRAPH_URL,
  ).origin,
}));
