import config from '@/shared/config';
import { z } from 'zod';

const orgIdSchema = z.string().uuid();

export function buildSsoStartUrl(
  apiBaseUrl: string,
  orgId: string,
  origin: string,
): string {
  const baseUrl = new URL(apiBaseUrl, origin);
  const apiPath = baseUrl.pathname.replace(/\/$/, '');
  baseUrl.pathname = `${apiPath}/auth/sso/organizations/${encodeURIComponent(orgId)}/start`;
  baseUrl.search = '';
  baseUrl.hash = '';
  return baseUrl.toString();
}

export function beginSso(orgId: string): void {
  window.location.assign(
    resolveSsoStartUrl(config.api.baseUrl, orgId, window.location.origin),
  );
}

export function resolveSsoStartUrl(
  apiBaseUrl: string,
  orgId: string,
  origin: string,
): string {
  if (!orgIdSchema.safeParse(orgId).success) {
    return new URL(
      '/sso/error?code=SSO_CONNECTION_NOT_AVAILABLE',
      origin,
    ).toString();
  }
  return buildSsoStartUrl(apiBaseUrl, orgId, origin);
}
