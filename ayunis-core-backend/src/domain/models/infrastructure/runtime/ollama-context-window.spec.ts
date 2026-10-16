import type { ConfigService } from '@nestjs/config';
import type { ModelProvider } from '@ayunis/inference';
import type { ImageContentService } from 'src/domain/messages/application/services/image-content.service';
import type { Model } from 'src/domain/models/domain/model.entity';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { ModelProvider as ModelProviderName } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { AyunisOllamaInferenceHandler } from 'src/domain/models/infrastructure/inference/ayunis-ollama.inference';
import { LocalOllamaInferenceHandler } from 'src/domain/models/infrastructure/inference/local-ollama.inference';
import { SynaforceInferenceHandler } from 'src/domain/models/infrastructure/inference/synaforce.inference';
import { AyunisOllamaStreamInferenceHandler } from 'src/domain/models/infrastructure/stream-inference/ayunis-ollama.stream-inference';
import { LocalOllamaStreamInferenceHandler } from 'src/domain/models/infrastructure/stream-inference/local-ollama.stream-inference';
import { SynaforceStreamInferenceHandler } from 'src/domain/models/infrastructure/stream-inference/synaforce.stream-inference';

const ollamaMock = jest.fn<ModelProvider, [unknown]>();

jest.mock('@ayunis/provider-ollama', () => ({
  ollama: (options: unknown) => ollamaMock(options),
}));

type HandlerConstructor = new (
  configService: ConfigService,
  imageContentService: ImageContentService,
) => object;

const ollamaHandlers: Array<{ name: string; Handler: HandlerConstructor }> = [
  {
    name: 'local Ollama streaming',
    Handler: LocalOllamaStreamInferenceHandler,
  },
  {
    name: 'Ayunis Ollama streaming',
    Handler: AyunisOllamaStreamInferenceHandler,
  },
  { name: 'Synaforce streaming', Handler: SynaforceStreamInferenceHandler },
  { name: 'local Ollama', Handler: LocalOllamaInferenceHandler },
  { name: 'Ayunis Ollama', Handler: AyunisOllamaInferenceHandler },
  { name: 'Synaforce', Handler: SynaforceInferenceHandler },
];

function languageModel(contextWindowSize?: number): LanguageModel {
  return new LanguageModel({
    name: 'llama3.1',
    displayName: 'Llama 3.1',
    provider: ModelProviderName.OLLAMA,
    canStream: true,
    isReasoning: false,
    isArchived: false,
    canUseTools: true,
    canVision: false,
    contextWindowSize,
  });
}

function createProvider(Handler: HandlerConstructor, model: Model): void {
  const handler = new Handler(
    {
      get: jest.fn().mockReturnValue('configured-value'),
    } as unknown as ConfigService,
    {} as ImageContentService,
  );
  (
    handler as unknown as { createProvider: (model: Model) => ModelProvider }
  ).createProvider(model);
}

describe('Ollama context window', () => {
  beforeEach(() => {
    ollamaMock.mockReset();
    ollamaMock.mockReturnValue({ name: 'ollama:test', stream: jest.fn() });
  });

  it.each(ollamaHandlers)(
    '$name serves the catalog context window as num_ctx',
    ({ Handler }) => {
      createProvider(Handler, languageModel(64_000));

      expect(ollamaMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ numCtx: 64_000 }),
      );
    },
  );

  it.each(ollamaHandlers)(
    '$name keeps the provider default when the catalog has no value',
    ({ Handler }) => {
      createProvider(Handler, languageModel());

      expect(ollamaMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ numCtx: undefined }),
      );
    },
  );
});
