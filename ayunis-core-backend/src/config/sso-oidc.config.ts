import { registerAs } from '@nestjs/config';
import { isLoopbackHttpUrl } from 'src/config/sso-oidc-url';

export interface SsoOidcConfig {
  issuer?: string;
  clientId?: string;
  clientSecret?: string;
  callbackUrl?: string;
  allowInsecureRequests: boolean;
}

export const ssoOidcConfig = registerAs('ssoOidc', (): SsoOidcConfig => ({
  issuer: process.env.SSO_OIDC_ISSUER || undefined,
  clientId: process.env.SSO_OIDC_CLIENT_ID || undefined,
  clientSecret: process.env.SSO_OIDC_CLIENT_SECRET || undefined,
  callbackUrl: process.env.SSO_OIDC_CALLBACK_URL || undefined,
  allowInsecureRequests:
    process.env.NODE_ENV !== 'production' &&
    isLoopbackHttpUrl(process.env.SSO_OIDC_ISSUER ?? ''),
}));
