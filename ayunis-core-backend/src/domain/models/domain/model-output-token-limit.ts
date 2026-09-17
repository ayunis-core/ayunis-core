import type { Model } from 'src/domain/models/domain/model.entity';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';

// AYC-674 raised Claude above the provider package's 16,384 default because
// long artifact tool arguments were truncated before they could be executed.
const DEFAULT_MAX_OUTPUT_TOKENS = 4_096;
const CLAUDE_MAX_OUTPUT_TOKENS = 32_000;
const GPT_4O_MAX_OUTPUT_TOKENS = 16_384;

export function resolveModelMaxOutputTokens(
  model: Pick<Model, 'name' | 'provider'>,
): number {
  const isOpenAiGpt4o =
    (model.provider === ModelProvider.OPENAI ||
      model.provider === ModelProvider.AZURE) &&
    model.name.startsWith('gpt-4o');
  if (isOpenAiGpt4o) return GPT_4O_MAX_OUTPUT_TOKENS;
  const usesClaudeCeiling =
    model.provider === ModelProvider.ANTHROPIC ||
    model.provider === ModelProvider.BEDROCK;
  return usesClaudeCeiling
    ? CLAUDE_MAX_OUTPUT_TOKENS
    : DEFAULT_MAX_OUTPUT_TOKENS;
}
