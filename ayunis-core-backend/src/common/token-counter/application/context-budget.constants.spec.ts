import {
  MAX_CONTEXT_TOKENS,
  getContextWindowTokens,
  getLongChatWarningThresholdTokens,
} from './context-budget.constants';

describe('context budget', () => {
  it('uses the configured context window without reserving output tokens', () => {
    expect(getContextWindowTokens(1_000_000)).toBe(1_000_000);
  });

  it('falls back to 200k when no context window is configured', () => {
    expect(getContextWindowTokens()).toBe(MAX_CONTEXT_TOKENS);
  });

  it('warns at 90 percent of the configured context window', () => {
    expect(getLongChatWarningThresholdTokens(1_000_000)).toBe(900_000);
  });

  it('warns at 90 percent of the fallback context window', () => {
    expect(getLongChatWarningThresholdTokens()).toBe(180_000);
  });
});
