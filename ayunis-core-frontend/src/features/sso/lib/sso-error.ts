export type SsoErrorKind =
  | 'unavailable'
  | 'accountLinkRequired'
  | 'accountLinkConflict'
  | 'accountLinkMismatch'
  | 'invitationRequired'
  | 'inviteExpired'
  | 'expired'
  | 'invalidResponse'
  | 'providerUnavailable'
  | 'unexpected';

const ERROR_KIND_BY_CODE: Record<string, SsoErrorKind> = {
  SSO_CONNECTION_NOT_AVAILABLE: 'unavailable',
  SSO_ACCOUNT_LINK_REQUIRED: 'accountLinkRequired',
  SSO_ACCOUNT_LINK_CONFLICT: 'accountLinkConflict',
  SSO_ACCOUNT_LINK_MISMATCH: 'accountLinkMismatch',
  SSO_JIT_PROVISIONING_DISABLED: 'invitationRequired',
  SSO_INVITE_EXPIRED: 'inviteExpired',
  SSO_LOGIN_TRANSACTION_INVALID: 'expired',
  SSO_ORGANIZATION_MISMATCH: 'invalidResponse',
  SSO_BROKER_RESPONSE_INVALID: 'invalidResponse',
  SSO_BROKER_NOT_CONFIGURED: 'providerUnavailable',
};

export function resolveSsoError(code: string | undefined): SsoErrorKind {
  if (code?.startsWith('PROVIDER_UNAVAILABLE_')) {
    return 'providerUnavailable';
  }
  return code ? (ERROR_KIND_BY_CODE[code] ?? 'unexpected') : 'unexpected';
}
