import extractErrorData from '@/shared/api/extract-error-data';

const SSO_ERROR_KEYS: Record<string, string> = {
  SSO_CONNECTION_CONFLICT: 'sso.errors.conflict',
  SSO_CONNECTION_MUST_BE_DISABLED: 'sso.errors.mustDisable',
  SSO_CONNECTION_CHANGED: 'sso.errors.changed',
  SSO_CONNECTION_NOT_FOUND: 'sso.errors.notFound',
  SSO_INVALID_CONFIGURATION: 'sso.errors.invalid',
};

export function getSsoErrorKey(error: unknown): string {
  try {
    const { code } = extractErrorData(error);
    return SSO_ERROR_KEYS[code] ?? 'sso.errors.unexpected';
  } catch {
    return 'sso.errors.unexpected';
  }
}
