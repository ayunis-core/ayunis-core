import { AxiosError, AxiosHeaders } from 'axios';
import { describe, expect, it } from 'vitest';
import { orgLifecycleErrorKey } from './orgLifecycleError';

function responseError(code: string) {
  return new AxiosError('Request failed', undefined, undefined, undefined, {
    data: { code },
    status: 400,
    statusText: 'Bad Request',
    headers: {},
    config: { headers: new AxiosHeaders() },
  });
}

describe('Organisation lifecycle error messages', () => {
  it.each([
    ['ORG_NOT_FOUND', 'lifecycle.errorNotFound'],
    ['ORG_DELETE_CONFIRMATION_MISMATCH', 'lifecycle.confirmationMismatch'],
    ['ORG_PROCESSING_ACTIVE', 'lifecycle.processingActive'],
    ['ORG_DELETION_FAILED', 'lifecycle.cleanupIncomplete'],
    ['ORG_UNAUTHORIZED', 'lifecycle.errorUnauthorized'],
    ['VALIDATION_ERROR', 'lifecycle.error'],
    ['UNKNOWN_CODE', 'lifecycle.error'],
  ])('maps %s to %s', (code, key) => {
    expect(orgLifecycleErrorKey(responseError(code))).toBe(key);
  });

  it('uses the generic message for network failures', () => {
    expect(orgLifecycleErrorKey(new Error('Network unavailable'))).toBe(
      'lifecycle.error',
    );
  });
});
