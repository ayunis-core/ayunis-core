import type { ConfigService } from '@nestjs/config';
import type { ModelProvider } from '@ayunis/inference';
import { AnthropicInferenceProviderFactory } from './anthropic.inference-provider';
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

  it('uses the full Claude output budget so long tool calls are not cut off at 64K', () => {
    const { createProvider } = buildFactory();

    createProvider({ name: 'claude-opus-5' } as Model);

    expect(anthropicMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-opus-5',
        maxTokens: 128_000,
      }),
    );
  });

  it('keeps the supported 64K ceiling for older Claude models', () => {
    const { createProvider } = buildFactory();

    createProvider({ name: 'claude-haiku-4-5' } as Model);

    expect(anthropicMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-haiku-4-5',
        maxTokens: 64_000,
      }),
    );
  });
});
