import { AxiosError, type AxiosResponse } from 'axios';
import { describe, expect, it } from 'vitest';
import { improveTextErrorKey } from './improve-text-error';

const ROUTINE_CODES = {
  emptyAnswer: 'ROUTINE_PROMPT_IMPROVEMENT_FAILED',
  anonymousOnly: 'ROUTINE_PROMPT_IMPROVEMENT_UNAVAILABLE',
};

function failure(code: string): AxiosError {
  const response = { data: { code }, status: 422 } as AxiosResponse;
  return new AxiosError('failed', undefined, undefined, undefined, response);
}

describe('improveTextErrorKey', () => {
  it.each([
    ['ROUTINE_PROMPT_IMPROVEMENT_FAILED', 'improveText.emptyAnswer'],
    ['ROUTINE_PROMPT_IMPROVEMENT_UNAVAILABLE', 'improveText.anonymousOnly'],
    ['NO_DEFAULT_MODEL_FOUND', 'improveText.noModel'],
    ['TEAM_CREDIT_LIMIT_EXCEEDED', 'improveText.limitReached'],
  ])("explains the improver's own failure %s", (code, key) => {
    expect(improveTextErrorKey(failure(code), ROUTINE_CODES)).toBe(key);
  });

  it("does not read another improver's codes as this one's", () => {
    expect(
      improveTextErrorKey(
        failure('SKILL_TEXT_IMPROVEMENT_UNAVAILABLE'),
        ROUTINE_CODES,
      ),
    ).toBe('improveText.error');
  });

  it('falls back to the generic message when the request never got an answer', () => {
    expect(improveTextErrorKey(new Error('offline'), ROUTINE_CODES)).toBe(
      'improveText.error',
    );
  });
});
