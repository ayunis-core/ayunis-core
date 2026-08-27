import { InvalidSsoConnectionValueError } from 'src/iam/sso/domain/invalid-sso-connection-value.error';

export const EMAIL_DOMAIN_PATTERN =
  '^([a-z0-9]|[a-z0-9][a-z0-9-]{0,61}[a-z0-9])([.]([a-z0-9]|[a-z0-9][a-z0-9-]{0,61}[a-z0-9]))+$';

const emailDomainRegex = new RegExp(EMAIL_DOMAIN_PATTERN);
const invalidEmailLocalPartPattern = /[\p{White_Space}\p{Cc}]/u;
const invalidZitadelIdPattern = /[\p{White_Space}\p{Cc}]/u;

export function normalizeEmailDomain(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (normalized.length > 253 || !emailDomainRegex.test(normalized)) {
    throw new InvalidSsoConnectionValueError('emailDomain');
  }
  return normalized;
}

export function emailDomainFromAddress(value: string): string | null {
  const normalized = value.trim().toLowerCase();
  const separator = normalized.indexOf('@');
  if (
    separator <= 0 ||
    separator !== normalized.lastIndexOf('@') ||
    invalidEmailLocalPartPattern.test(normalized.slice(0, separator))
  ) {
    return null;
  }
  try {
    return normalizeEmailDomain(normalized.slice(separator + 1));
  } catch (error) {
    if (error instanceof InvalidSsoConnectionValueError) {
      return null;
    }
    throw error;
  }
}

function normalizeZitadelId(
  value: string,
  field: 'zitadelOrgId' | 'zitadelIdpId',
): string {
  const normalized = value.trim();
  if (
    normalized.length === 0 ||
    normalized.length > 255 ||
    invalidZitadelIdPattern.test(normalized)
  ) {
    throw new InvalidSsoConnectionValueError(field);
  }
  return normalized;
}

export function normalizeZitadelOrgId(value: string): string {
  return normalizeZitadelId(value, 'zitadelOrgId');
}

export function normalizeZitadelIdpId(value: string): string {
  return normalizeZitadelId(value, 'zitadelIdpId');
}
