import type { ConfigService } from '@nestjs/config';
import type { ModelProvider } from '@ayunis/inference';
import type { ImageContentService } from 'src/domain/messages/application/services/image-content.service';
import type { Model } from 'src/domain/models/domain/model.entity';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { ModelProvider as ModelProviderName } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { INFERENCE_MAX_RETRIES } from 'src/domain/models/infrastructure/runtime/inference-config';
import { AzureInferenceHandler } from './azure.inference';

const azureMock = jest.fn<ModelProvider, [unknown]>();

jest.mock('@ayunis/provider-openai', () => ({
  azure: (options: unknown) => azureMock(options),
}));

type CreateProvider = (model: Model) => ModelProvider;

const createModel = (name: string, isReasoning: boolean): LanguageModel =>
  new LanguageModel({
    name,
    provider: ModelProviderName.AZURE,
    displayName: name,
    canStream: true,
    canUseTools: true,
    isReasoning,
    canVision: false,
    isArchived: false,
  });

describe('AzureInferenceHandler', () => {
  beforeEach(() => {
    azureMock.mockReset();
    azureMock.mockReturnValue({ name: 'azure:test', stream: jest.fn() });
  });

  const buildProvider = (model: Model): ModelProvider => {
    const configService = {
      get: jest.fn((key: string) =>
        key.endsWith('apiKey')
          ? 'azure-key'
          : 'https://example.openai.azure.com',
      ),
    } as unknown as ConfigService;
    const handler = new AzureInferenceHandler(
      configService,
      {} as ImageContentService,
    );
    return (
      handler as unknown as { createProvider: CreateProvider }
    ).createProvider(model);
  };

  it('uses low reasoning for reasoning models', () => {
    buildProvider(createModel('gpt-6-astra', true));

    expect(azureMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-6-astra',
        maxRetries: INFERENCE_MAX_RETRIES,
        reasoningEffort: 'low',
      }),
    );
  });

  it('does not enable reasoning for non-reasoning models', () => {
    buildProvider(createModel('gpt-5.4', false));

    expect(azureMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-5.4',
        reasoningEffort: undefined,
      }),
    );
  });
});
