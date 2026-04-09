export interface ParsedOAuthInfo {
  enabled: boolean;
  level: 'org' | 'user' | null;
  authorized: boolean;
}

export function parseOAuthInfo(value: unknown): ParsedOAuthInfo | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const oauth = value as Record<string, unknown>;
  if (oauth.enabled !== true && oauth.enabled !== false) {
    return null;
  }
  if (oauth.level !== null && oauth.level !== 'org' && oauth.level !== 'user') {
    return null;
  }
  if (oauth.authorized !== true && oauth.authorized !== false) {
    return null;
  }

  return {
    enabled: oauth.enabled,
    level: oauth.level as ParsedOAuthInfo['level'],
    authorized: oauth.authorized,
  };
}

export function getOAuthErrorMessage(
  t: (key: string) => string,
  reason: string | null,
  keyPrefix: string,
): string {
  if (!reason) {
    return t(`${keyPrefix}errorToast`);
  }

  const normalizedReason = reason.toLowerCase();
  if (normalizedReason.includes('state')) {
    return t(`${keyPrefix}errorState`);
  }
  if (normalizedReason.includes('exchange')) {
    return t(`${keyPrefix}errorOauthExchange`);
  }
  if (normalizedReason.includes('client credentials')) {
    return t(`${keyPrefix}errorClientNotConfigured`);
  }

  return t(`${keyPrefix}errorToast`);
}
