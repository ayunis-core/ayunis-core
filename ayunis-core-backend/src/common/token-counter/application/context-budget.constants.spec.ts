import {
  MAX_CONTEXT_TOKENS,
  getContextWindowTokens,
  getLongChatWarningThresholdTokens,
  getMessageBudgetTokens,
  getTokenizerSafetyRatio,
} from './context-budget.constants';

describe('context budget', () => {
  it('uses the configured context window without reserving output tokens', () => {
    expect(getContextWindowTokens(1_000_000)).toBe(1_000_000);
  });

  it('falls back to 200k when no context window is configured', () => {
    expect(getContextWindowTokens()).toBe(MAX_CONTEXT_TOKENS);
  });

  it('warns at 80 percent of the configured context window', () => {
    expect(getLongChatWarningThresholdTokens(1_000_000)).toBe(800_000);
  });

  it('warns at 80 percent of the fallback context window', () => {
    expect(getLongChatWarningThresholdTokens()).toBe(160_000);
  });

  it('warns before trimming starts for a request with ordinary fixed parts', () => {
    expect(getLongChatWarningThresholdTokens(200_000)).toBeLessThan(
      getMessageBudgetTokens(200_000, 15_000, 0.9),
    );
  });

  it('leaves a tokenizer margin and room for the fixed request parts', () => {
    expect(getMessageBudgetTokens(200_000, 12_000, 0.9)).toBe(168_000);
  });

  it('gives an exact tokenizer less headroom than an estimate', () => {
    expect(getTokenizerSafetyRatio(true)).toBeCloseTo(0.97);
    expect(getTokenizerSafetyRatio(false)).toBeCloseTo(0.9);
  });

  it('never returns a negative message budget', () => {
    expect(getMessageBudgetTokens(10_000, 50_000, 0.9)).toBe(0);
  });
});
