import { DEFAULT_MAX_TOKENS as MISTRAL_MAX_OUTPUT_TOKENS } from '@ayunis/provider-mistral';
import { DEFAULT_NUM_CTX, DEFAULT_NUM_PREDICT } from '@ayunis/provider-ollama';
import {
  CLAUDE_MAX_OUTPUT_TOKENS,
  MAX_CONTEXT_TOKENS,
  getContextWindowTokens,
  getHistoryBudgetTokens,
  getLongChatWarningThresholdTokens,
} from './context-budget.constants';

describe('context budget', () => {
  it.each([
    ['eu.anthropic.claude-haiku-4-5-20251001-v1:0', 200_000],
    ['claude-opus-4-7', 1_000_000],
    ['eu.anthropic.claude-opus-5', 1_000_000],
    ['eu.anthropic.claude-sonnet-4-6', 1_000_000],
    ['eu.anthropic.claude-sonnet-5', 1_000_000],
    ['gpt-5.6-luna', 1_050_000],
    ['gpt-5.6-sol', 1_050_000],
    ['gpt-5.6-terra', 1_050_000],
    ['gpt-6-astra', 1_050_000],
    ['mistral-medium-latest', 131_072],
    ['gpt-oss:120b', DEFAULT_NUM_CTX],
  ])('resolves %s to its provider context window', (modelName, expected) => {
    expect(getContextWindowTokens(modelName)).toBe(expected);
  });

  it.each(['archived-provider-model', 'constructor'])(
    'falls back to 200k for unknown model name %s',
    (modelName) => {
      expect(getContextWindowTokens(modelName)).toBe(MAX_CONTEXT_TOKENS);
    },
  );

  it.each([
    [
      'eu.anthropic.claude-haiku-4-5-20251001-v1:0',
      200_000 - CLAUDE_MAX_OUTPUT_TOKENS,
    ],
    ['claude-opus-4-7', 1_000_000 - CLAUDE_MAX_OUTPUT_TOKENS],
    ['eu.anthropic.claude-opus-5', 1_000_000 - CLAUDE_MAX_OUTPUT_TOKENS],
    ['eu.anthropic.claude-sonnet-4-6', 1_000_000 - CLAUDE_MAX_OUTPUT_TOKENS],
    ['eu.anthropic.claude-sonnet-5', 1_000_000 - CLAUDE_MAX_OUTPUT_TOKENS],
    ['gpt-5.6-luna', 922_000],
    ['gpt-5.6-sol', 922_000],
    ['gpt-5.6-terra', 922_000],
    ['gpt-6-astra', 922_000],
    ['mistral-medium-latest', 131_072 - MISTRAL_MAX_OUTPUT_TOKENS],
    ['gpt-oss:120b', DEFAULT_NUM_CTX - DEFAULT_NUM_PREDICT],
  ])('reserves the provider-backed output allowance for %s', (name, budget) => {
    expect(getHistoryBudgetTokens(name)).toBe(budget);
  });

  it.each([undefined, 'archived-provider-model', 'constructor'])(
    'uses the legacy history budget for unknown model name %s',
    (modelName) => {
      expect(getHistoryBudgetTokens(modelName)).toBe(175_000);
    },
  );

  it('applies the long-chat warning ratio to the full context window', () => {
    expect(getLongChatWarningThresholdTokens('claude-opus-4-7')).toBe(625_000);
  });
});
