import { AxiosError, AxiosHeaders } from 'axios';
import { describe, expect, it } from 'vitest';
import { ownerChangeErrorKey } from './owner-change-error';

function apiError(code: string): AxiosError {
  return new AxiosError('failed', undefined, undefined, undefined, {
    data: { code },
    status: 400,
    statusText: 'Bad Request',
    headers: {},
    config: { headers: new AxiosHeaders() },
  });
}

describe('ownerChangeErrorKey', () => {
  it.each([
    ['DUPLICATE_SKILL_NAME', 'change.duplicateName'],
    ['SKILL_OWNER_CHANGE_NOT_ALLOWED', 'change.notAllowed'],
    ['KNOWLEDGE_BASE_OWNER_CHANGE_NOT_ALLOWED', 'change.notAllowed'],
    ['UNAUTHORIZED_ACCESS', 'change.noPermission'],
    ['KNOWLEDGE_BASE_NOT_FOUND', 'change.notFound'],
    ['SOMETHING_ELSE', 'change.error'],
  ])('maps %s to %s', (code, key) => {
    expect(ownerChangeErrorKey(apiError(code))).toBe(key);
  });

  it('falls back to the generic message for non-API errors', () => {
    expect(ownerChangeErrorKey(new Error('network'))).toBe('change.error');
  });
});
