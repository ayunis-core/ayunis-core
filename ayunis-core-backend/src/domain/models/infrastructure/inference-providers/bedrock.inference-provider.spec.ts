import type { ConfigService } from '@nestjs/config';
import type { ModelProvider } from '@ayunis/inference';
import { BedrockInferenceProviderFactory } from './bedrock.inference-provider';
import type { Model } from 'src/domain/models/domain/model.entity';

const bedrockMock = jest.fn<ModelProvider, [unknown]>();

jest.mock('@ayunis/provider-anthropic/bedrock', () => ({
  bedrock: (options: unknown) => bedrockMock(options),
}));

type CreateProvider = (model: Model) => ModelProvider;

describe('BedrockInferenceProviderFactory', () => {
  beforeEach(() => {
    bedrockMock.mockReset();
    bedrockMock.mockReturnValue({ name: 'bedrock:test', stream: jest.fn() });
  });

  const buildFactory = () => {
    const configService = {
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as ConfigService;
    const factory = new BedrockInferenceProviderFactory(configService);
    const createProvider = (
      factory as unknown as { createProvider: CreateProvider }
    ).createProvider.bind(factory);
    return { createProvider };
  };

  it('uses the full Claude output budget so long tool calls are not cut off at 64K', () => {
    const { createProvider } = buildFactory();

    createProvider({ name: 'eu.anthropic.claude-opus-5' } as Model);

    expect(bedrockMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'eu.anthropic.claude-opus-5',
        maxTokens: 128_000,
      }),
    );
  });

  it('keeps the supported 64K ceiling for older Claude models', () => {
    const { createProvider } = buildFactory();

    createProvider({
      name: 'eu.anthropic.claude-haiku-4-5-20251001-v1:0',
    } as Model);

    expect(bedrockMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'eu.anthropic.claude-haiku-4-5-20251001-v1:0',
        maxTokens: 64_000,
      }),
    );
  });
});
