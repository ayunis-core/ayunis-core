import type { ConfigService } from '@nestjs/config';
import type { ModelProvider } from '@ayunis/inference';
import type { Model } from 'src/domain/models/domain/model.entity';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { ModelProvider as ModelProviderName } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { AyunisOllamaInferenceProviderFactory } from 'src/domain/models/infrastructure/inference-providers/ayunis-ollama.inference-provider';
import { LocalOllamaInferenceProviderFactory } from 'src/domain/models/infrastructure/inference-providers/local-ollama.inference-provider';
import { SynaforceInferenceProviderFactory } from 'src/domain/models/infrastructure/inference-providers/synaforce.inference-provider';

const ollamaMock = jest.fn<ModelProvider, [unknown]>();

jest.mock('@ayunis/provider-ollama', () => ({
  ollama: (options: unknown) => ollamaMock(options),
}));

type HandlerConstructor = new (configService: ConfigService) => object;

const ollamaHandlers: Array<{ name: string; Handler: HandlerConstructor }> = [
  { name: 'local Ollama', Handler: LocalOllamaInferenceProviderFactory },
  { name: 'Ayunis Ollama', Handler: AyunisOllamaInferenceProviderFactory },
  { name: 'Synaforce', Handler: SynaforceInferenceProviderFactory },
];

function languageModel(contextWindowSize: number): LanguageModel {
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
  const handler = new Handler({
    get: jest.fn().mockReturnValue('configured-value'),
  } as unknown as ConfigService);
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
    '$name preserves the provider default regardless of the catalog window',
    ({ Handler }) => {
      createProvider(Handler, languageModel(64_000));

      expect(ollamaMock.mock.calls.at(-1)?.[0]).not.toHaveProperty('numCtx');
    },
  );
});
