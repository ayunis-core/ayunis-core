import { DEFAULT_MAX_TOKENS as MISTRAL_MAX_OUTPUT_TOKENS } from '@ayunis/provider-mistral';
import { DEFAULT_NUM_CTX, DEFAULT_NUM_PREDICT } from '@ayunis/provider-ollama';

export const MAX_CONTEXT_TOKENS = 200_000;
export const CLAUDE_MAX_OUTPUT_TOKENS = 32_000;

const MODEL_CONTEXT_WINDOWS = new Map<string, number>([
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
]);

// Preserves the former 175k history allowance for archived 200k models.
const FALLBACK_MAX_OUTPUT_TOKENS = 25_000;
// Azure publishes 922k input plus 128k output for these 1.05M models.
const AZURE_MAX_OUTPUT_TOKENS = 128_000;
const MODEL_MAX_OUTPUT_TOKENS = new Map<string, number>([
  ['eu.anthropic.claude-haiku-4-5-20251001-v1:0', CLAUDE_MAX_OUTPUT_TOKENS],
  ['claude-opus-4-7', CLAUDE_MAX_OUTPUT_TOKENS],
  ['eu.anthropic.claude-opus-5', CLAUDE_MAX_OUTPUT_TOKENS],
  ['eu.anthropic.claude-sonnet-4-6', CLAUDE_MAX_OUTPUT_TOKENS],
  ['eu.anthropic.claude-sonnet-5', CLAUDE_MAX_OUTPUT_TOKENS],
  ['gpt-5.6-luna', AZURE_MAX_OUTPUT_TOKENS],
  ['gpt-5.6-sol', AZURE_MAX_OUTPUT_TOKENS],
  ['gpt-5.6-terra', AZURE_MAX_OUTPUT_TOKENS],
  ['gpt-6-astra', AZURE_MAX_OUTPUT_TOKENS],
  ['mistral-medium-latest', MISTRAL_MAX_OUTPUT_TOKENS],
  ['gpt-oss:120b', DEFAULT_NUM_PREDICT],
]);
const LONG_CHAT_WARNING_RATIO = 5 / 8;

export function getContextWindowTokens(modelName?: string): number {
  return modelName === undefined
    ? MAX_CONTEXT_TOKENS
    : (MODEL_CONTEXT_WINDOWS.get(modelName) ?? MAX_CONTEXT_TOKENS);
}

export function getHistoryBudgetTokens(modelName?: string): number {
  const maxOutputTokens =
    modelName === undefined
      ? FALLBACK_MAX_OUTPUT_TOKENS
      : (MODEL_MAX_OUTPUT_TOKENS.get(modelName) ?? FALLBACK_MAX_OUTPUT_TOKENS);
  return getContextWindowTokens(modelName) - maxOutputTokens;
}

export function getLongChatWarningThresholdTokens(modelName?: string): number {
  return Math.floor(
    getContextWindowTokens(modelName) * LONG_CHAT_WARNING_RATIO,
  );
}
