import { resolveModelMaxOutputTokens } from './model-output-token-limit';
import { ModelProvider } from './value-objects/model-provider.enum';

describe('resolveModelMaxOutputTokens', () => {
  it.each([ModelProvider.OPENAI, ModelProvider.AZURE])(
    'caps GPT-4o models hosted by %s at their supported output limit',
    (provider) => {
      expect(resolveModelMaxOutputTokens({ name: 'gpt-4o', provider })).toBe(
        16_384,
      );
    },
  );

  it.each([ModelProvider.ANTHROPIC, ModelProvider.BEDROCK])(
    'keeps the established Claude output ceiling for %s',
    (provider) => {
      expect(
        resolveModelMaxOutputTokens({ name: 'custom-deployment', provider }),
      ).toBe(32_000);
    },
  );

  it.each([
    ModelProvider.OPENAI,
    ModelProvider.AZURE,
    ModelProvider.MISTRAL,
    ModelProvider.GEMINI,
  ])('uses a provider-safe fallback for unknown %s models', (provider) => {
    expect(
      resolveModelMaxOutputTokens({ name: 'custom-deployment', provider }),
    ).toBe(4_096);
  });
});
