import { estimatedTokens, type TokenEstimator } from '@ayunis/inference';
import {
  countMessageTokens,
  countThreadTokens,
  getMessageBudget,
  MAX_CONTEXT_TOKENS,
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

describe('countThreadTokens', () => {
  const fixed: TokenEstimator = {
    exact: true,
    tokensPerMessage: 3,
    tokensPerImage: 7,
    countText: (text) => text.length,
    countTools: () => 0,
  };

  it('prices the joined text once and adds every image and message cost', () => {
    const thread = [
      [{ kind: 'text', text: 'ab' } as const, { kind: 'image' } as const],
      [{ kind: 'text', text: 'cde' } as const],
    ];

    expect(countThreadTokens(fixed, thread)).toBe('ab\ncde'.length + 7 + 2 * 3);
  });

  it('counts an empty thread as nothing', () => {
    expect(countThreadTokens(fixed, [])).toBe(0);
  });

  it('stays within one token per message of the per-message count', () => {
    const estimator = estimatedTokens();
    const thread = Array.from({ length: 40 }, (_, i) => [
      {
        kind: 'text',
        text: `Nachricht ${i}: Bitte prüfen Sie den Antrag der Familie Müller.`,
      } as const,
      ...(i % 5 === 0 ? [{ kind: 'image' } as const] : []),
    ]);
    const perMessage = thread.reduce(
      (total, parts) => total + countMessageTokens(estimator, parts),
      0,
    );

    const batched = countThreadTokens(estimator, thread);

    expect(Math.abs(batched - perMessage)).toBeLessThanOrEqual(thread.length);
    expect(batched).toBeGreaterThan(8 * estimator.tokensPerImage);
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
        provider: 'azure',
        name: 'gpt-5.6-sol',
        contextWindowSize: 1_000,
      },
      tokens: lengthEstimator(true),
    });

    expect(budget).toBe(950);
  });

  it('falls back to the shared estimate and its margin without a provider estimator', () => {
    const budget = getMessageBudget({
      instructions: '',
      tools: [],
      model: {
        provider: 'anthropic',
        name: 'claude',
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
