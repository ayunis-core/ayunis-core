import config from '@/shared/config';
import { z } from 'zod';

const orgIdSchema = z.string().uuid();
const postLoginPathKey = 'ayunis.sso.postLoginPath';

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

export function beginSso(orgId: string, postLoginPath?: string): void {
  rememberSsoPostLoginPath(postLoginPath);
  navigateToExternalUrl(
    resolveSsoStartUrl(config.api.baseUrl, orgId, window.location.origin),
  );
}

export function showSsoConnectionUnavailable(): void {
  window.location.assign(
    new URL(
      '/sso/error?code=SSO_CONNECTION_NOT_AVAILABLE',
      window.location.origin,
    ).toString(),
  );
}

export function rememberSsoPostLoginPath(path?: string): void {
  const safePath = normalizeInternalPath(path);
  if (safePath) {
    window.sessionStorage.setItem(postLoginPathKey, safePath);
    return;
  }
  window.sessionStorage.removeItem(postLoginPathKey);
}

export function takeSsoPostLoginPath(): string {
  const path = window.sessionStorage.getItem(postLoginPathKey);
  window.sessionStorage.removeItem(postLoginPathKey);
  return normalizeInternalPath(path ?? undefined) ?? '/chat';
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

function normalizeInternalPath(path?: string): string | null {
  if (!path?.startsWith('/') || path.startsWith('//')) return null;
  const url = new URL(path, window.location.origin);
  if (url.origin !== window.location.origin) return null;
  return `${url.pathname}${url.search}${url.hash}`;
}

export function navigateToExternalUrl(url: string): void {
  window.location.assign(url);
}
