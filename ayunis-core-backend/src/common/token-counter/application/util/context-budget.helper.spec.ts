import type { TokenEstimator } from '@ayunis/inference';
import {
  countMessageTokens,
  countThreadTokens,
  getContextOverflowReductionTokens,
  getMessageBudget,
  DEFAULT_CONTEXT_WINDOW_TOKENS,
  getContextWindowTokens,
  getLongChatWarningThresholdTokens,
  getMessageBudgetTokens,
  getTokenizerSafetyRatio,
} from './context-budget.helper';

describe('context budget helper', () => {
  it('uses the configured context window without reserving output tokens', () => {
    expect(getContextWindowTokens(1_000_000)).toBe(1_000_000);
  });

  it('falls back to 200k when no context window is configured', () => {
    expect(getContextWindowTokens()).toBe(DEFAULT_CONTEXT_WINDOW_TOKENS);
  });

  it('warns at 80 percent of the configured context window', () => {
    expect(getLongChatWarningThresholdTokens(1_000_000)).toBe(800_000);
  });

  it('warns at 80 percent of the fallback context window', () => {
    expect(getLongChatWarningThresholdTokens()).toBe(160_000);
  });

  it('reduces the budget by the reported overflow plus a window margin', () => {
    expect(getContextOverflowReductionTokens(200_000, 10_950)).toBe(20_950);
  });

  it('falls back to a tenth of the window when no overflow was reported', () => {
    expect(getContextOverflowReductionTokens(200_000)).toBe(20_000);
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

describe('countThreadTokens', () => {
  const fixed: TokenEstimator = {
    exact: true,
    tokensPerMessage: 3,
    tokensPerImage: 7,
    countText: (text) => text.length,
    countTools: () => 0,
  };

  it('prices every text part, image and message', () => {
    const thread = [
      [{ kind: 'text', text: 'ab' } as const, { kind: 'image' } as const],
      [{ kind: 'text', text: 'cde' } as const],
    ];

    expect(countThreadTokens(fixed, thread)).toBe(2 + 3 + 7 + 2 * 3);
  });

  it('counts an empty thread as nothing', () => {
    expect(countThreadTokens(fixed, [])).toBe(0);
  });
});

describe('message budget', () => {
  const lengthEstimator = (exact: boolean): TokenEstimator => ({
    exact,
    tokensPerMessage: 2,
    tokensPerImage: 100,
    countText: (text) => text.length,
    countTools: (tools) => tools.length * 10,
  });

  it('subtracts the counted instructions and tools from the scaled window', () => {
    const budget = getMessageBudget({
      instructions: 'i'.repeat(10),
      tools: [{ name: 'search', description: 's', parameters: {} }],
      model: {
        contextWindowSize: 1_000,
      },
      tokenEstimator: lengthEstimator(true),
    });

    expect(budget).toBe(950);
  });

  it('falls back to the shared estimate and its margin without a provider estimator', () => {
    const budget = getMessageBudget({
      instructions: '',
      tools: [],
      model: {
        contextWindowSize: 1_000,
      },
    });

    expect(budget).toBe(900);
  });

  it('counts a message as its framing plus its text and image parts', () => {
    expect(
      countMessageTokens(lengthEstimator(false), [
        { kind: 'text', text: 'hello' },
        { kind: 'image' },
      ]),
    ).toBe(107);
  });
});
