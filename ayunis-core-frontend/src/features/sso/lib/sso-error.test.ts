import { describe, expect, it } from 'vitest';
import { resolveSsoError } from '@/features/sso/lib/sso-error';

describe('resolveSsoError', () => {
  it.each([
    ['SSO_CONNECTION_NOT_AVAILABLE', 'unavailable'],
    ['SSO_ACCOUNT_LINK_REQUIRED', 'accountLinkRequired'],
    ['SSO_ACCOUNT_LINK_CONFLICT', 'accountLinkConflict'],
    ['SSO_ACCOUNT_LINK_MISMATCH', 'accountLinkMismatch'],
    ['SSO_JIT_PROVISIONING_DISABLED', 'invitationRequired'],
    ['SSO_INVITE_EXPIRED', 'inviteExpired'],
    ['SSO_LOGIN_TRANSACTION_INVALID', 'expired'],
    ['SSO_ORGANIZATION_MISMATCH', 'invalidResponse'],
    ['SSO_BROKER_RESPONSE_INVALID', 'invalidResponse'],
    ['SSO_BROKER_NOT_CONFIGURED', 'providerUnavailable'],
    ['PROVIDER_UNAVAILABLE_TIMEOUT_ZITADEL', 'providerUnavailable'],
    ['SOMETHING_INTERNAL', 'unexpected'],
    [undefined, 'unexpected'],
  ])('maps %s to %s', (code, expected) => {
    expect(resolveSsoError(code)).toBe(expected);
  });
});
