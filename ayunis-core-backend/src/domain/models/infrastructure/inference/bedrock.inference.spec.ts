import type { ConfigService } from '@nestjs/config';
import type { ModelProvider } from '@ayunis/inference';
import { BedrockInferenceHandler } from './bedrock.inference';
import type { ImageContentService } from 'src/domain/messages/application/services/image-content.service';
import type { Model } from 'src/domain/models/domain/model.entity';
import { ModelProvider as CatalogModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';

const bedrockMock = jest.fn<ModelProvider, [unknown]>();

jest.mock('@ayunis/provider-anthropic/bedrock', () => ({
  bedrock: (options: unknown) => bedrockMock(options),
}));

type CreateProvider = (model: Model) => ModelProvider;

describe('BedrockInferenceHandler', () => {
  beforeEach(() => {
    bedrockMock.mockReset();
    bedrockMock.mockReturnValue({ name: 'bedrock:test', stream: jest.fn() });
  });

  const buildHandler = () => {
    const configService = {
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as ConfigService;
    const handler = new BedrockInferenceHandler(
      configService,
      {} as ImageContentService,
    );
    const createProvider = (
      handler as unknown as { createProvider: CreateProvider }
    ).createProvider.bind(handler);
    return { createProvider };
  };

  it('raises the output-token budget above the conservative default (AYC-674)', () => {
    const { createProvider } = buildHandler();

    createProvider({
      name: 'eu.anthropic.claude-opus-5',
      provider: CatalogModelProvider.BEDROCK,
    } as Model);

    expect(bedrockMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'eu.anthropic.claude-opus-5',
        maxTokens: 32_000,
      }),
    );
  });
});
