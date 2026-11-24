import type { TFunction } from 'i18next';

const REASON_KEYS: Record<string, string> = {
  required: 'required',
  'too-many': 'too-many',
  'ip-address': 'ip-address',
  wildcard: 'wildcard',
  'missing-dot': 'missing-dot',
  invalid: 'invalidDomain',
};

/** The message for a `ROUTINE_INVALID_ALLOWED_DOMAINS` error, from its metadata. */
export function allowedDomainsErrorMessage(
  metadata: Record<string, unknown> | undefined,
  t: TFunction,
): string {
  const reason = typeof metadata?.reason === 'string' ? metadata.reason : '';
  const domain = typeof metadata?.domain === 'string' ? metadata.domain : '';
  return t(`validation.allowedDomains.${REASON_KEYS[reason] ?? 'invalid'}`, {
    domain,
  });
}
