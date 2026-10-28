import type { ConfigService } from '@nestjs/config';
import type { ModelProvider } from '@ayunis/inference';
import { AnthropicInferenceProviderFactory } from './anthropic.inference-provider';
import { CLAUDE_MAX_OUTPUT_TOKENS } from 'src/domain/models/infrastructure/runtime/inference-config';
import type { Model } from 'src/domain/models/domain/model.entity';

const anthropicMock = jest.fn<ModelProvider, [unknown]>();

jest.mock('@ayunis/provider-anthropic', () => ({
  anthropic: (options: unknown) => anthropicMock(options),
}));

type CreateProvider = (model: Model) => ModelProvider;

describe('AnthropicInferenceProviderFactory', () => {
  beforeEach(() => {
    anthropicMock.mockReset();
    anthropicMock.mockReturnValue({
      name: 'anthropic:test',
      stream: jest.fn(),
    });
  });

  const buildFactory = () => {
    const configService = {
      get: jest.fn().mockReturnValue('sk-ant-test'),
    } as unknown as ConfigService;
    const factory = new AnthropicInferenceProviderFactory(configService);
    const createProvider = (
      factory as unknown as { createProvider: CreateProvider }
    ).createProvider.bind(factory);
    return { createProvider };
  };

  it('raises the output-token budget above the conservative default (AYC-674)', () => {
    const { createProvider } = buildFactory();

    createProvider({ name: 'claude-opus-5' } as Model);

    expect(anthropicMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-opus-5',
        maxTokens: CLAUDE_MAX_OUTPUT_TOKENS,
      }),
    );
    expect(CLAUDE_MAX_OUTPUT_TOKENS).toBeGreaterThan(16_384);
  });
});
