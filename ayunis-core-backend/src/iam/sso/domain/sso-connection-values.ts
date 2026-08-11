import { InvalidSsoConnectionValueError } from 'src/iam/sso/domain/invalid-sso-connection-value.error';

export const EMAIL_DOMAIN_PATTERN =
  '^([a-z0-9]|[a-z0-9][a-z0-9-]{0,61}[a-z0-9])([.]([a-z0-9]|[a-z0-9][a-z0-9-]{0,61}[a-z0-9]))+$';

const emailDomainRegex = new RegExp(EMAIL_DOMAIN_PATTERN);
const invalidZitadelOrgIdPattern = /[\p{White_Space}\p{Cc}]/u;

export function normalizeEmailDomain(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (normalized.length > 253 || !emailDomainRegex.test(normalized)) {
    throw new InvalidSsoConnectionValueError('emailDomain');
  }
  return normalized;
}

export function normalizeZitadelOrgId(value: string): string {
  const normalized = value.trim();
  if (
    normalized.length === 0 ||
    normalized.length > 255 ||
    invalidZitadelOrgIdPattern.test(normalized)
  ) {
    throw new InvalidSsoConnectionValueError('zitadelOrgId');
  }
  return normalized;
}
