export type McpOAuthLevel = 'org' | 'user' | null;

export interface ParsedMcpOAuthInfo {
  enabled: boolean;
  level: McpOAuthLevel;
  authorized: boolean;
}

export type McpOAuthErrorKey =
  | 'errorToast'
  | 'errorState'
  | 'errorOauthExchange'
  | 'errorClientNotConfigured';

export function parseMcpOAuthInfo(value: unknown): ParsedMcpOAuthInfo | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const oauth = value as Record<string, unknown>;
  const level = oauth.level === undefined ? null : oauth.level;

  if (typeof oauth.enabled !== 'boolean') {
    return null;
  }
  if (level !== null && level !== 'org' && level !== 'user') {
    return null;
  }
  if (typeof oauth.authorized !== 'boolean') {
    return null;
  }

  return {
    enabled: oauth.enabled,
    level,
    authorized: oauth.authorized,
  };
}

export function hasUserLevelOAuth(integration: { oauth?: unknown }): boolean {
  const oauthInfo = parseMcpOAuthInfo(integration.oauth);
  return oauthInfo?.enabled === true && oauthInfo.level === 'user';
}

export function getMcpOAuthErrorKey(reason: string | null): McpOAuthErrorKey {
  if (!reason) {
    return 'errorToast';
  }

  const normalizedReason = reason.toLowerCase();
  if (normalizedReason.includes('state')) {
    return 'errorState';
  }
  if (normalizedReason.includes('exchange')) {
    return 'errorOauthExchange';
  }
  if (normalizedReason.includes('client credentials')) {
    return 'errorClientNotConfigured';
  }

  return 'errorToast';
}
