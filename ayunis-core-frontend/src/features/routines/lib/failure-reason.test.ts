import { describe, expect, it } from 'vitest';
import { failureReasonKey } from './failure-reason';

describe('failureReasonKey', () => {
  it.each([
    ['finish_routine_not_called', 'failureReason.finishNotCalled'],
    ['timeout', 'failureReason.timeout'],
    ['ROUTINE_SUBSCRIPTION_REQUIRED', 'failureReason.subscriptionRequired'],
    ['CREDIT_BUDGET_EXCEEDED', 'failureReason.credits'],
    ['UNAUTHORIZED_ACCESS', 'failureReason.model'],
    ['interrupted', 'failureReason.interrupted'],
    ['ACADEMY_CERTIFICATE_REQUIRED', 'failureReason.academyCertificate'],
    ['permission_missing', 'failureReason.permissionMissing'],
  ])('explains %s', (reason, key) => {
    expect(failureReasonKey(reason)).toBe(key);
  });

  it('falls back to a generic explanation for an unknown code', () => {
    expect(failureReasonKey('PROVIDER_UNAVAILABLE_TIMEOUT_BEDROCK')).toBe(
      'failureReason.unknown',
    );
  });
});
