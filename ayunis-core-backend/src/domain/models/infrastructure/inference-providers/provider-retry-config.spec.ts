import type { ConfigService } from '@nestjs/config';
import type { ModelProvider } from '@ayunis/inference';
import { AnthropicInferenceProviderFactory } from './anthropic.inference-provider';
import { AyunisOllamaInferenceProviderFactory } from './ayunis-ollama.inference-provider';
import { AzureInferenceProviderFactory } from './azure.inference-provider';
import { BedrockInferenceProviderFactory } from './bedrock.inference-provider';
import { GeminiInferenceProviderFactory } from './gemini.inference-provider';
import { LocalOllamaInferenceProviderFactory } from './local-ollama.inference-provider';
import { MistralInferenceProviderFactory } from './mistral.inference-provider';
import { OpenAIInferenceProviderFactory } from './openai.inference-provider';
import { OtcInferenceProviderFactory } from './otc.inference-provider';
import { ScalewayInferenceProviderFactory } from './scaleway.inference-provider';
import { StackitInferenceProviderFactory } from './stackit.inference-provider';
import { SynaforceInferenceProviderFactory } from './synaforce.inference-provider';
import type { Model } from 'src/domain/models/domain/model.entity';

const anthropicMock = jest.fn<ModelProvider, [unknown]>();
const azureMock = jest.fn<ModelProvider, [unknown]>();
const bedrockMock = jest.fn<ModelProvider, [unknown]>();
const geminiMock = jest.fn<ModelProvider, [unknown]>();
const mistralMock = jest.fn<ModelProvider, [unknown]>();
const ollamaMock = jest.fn<ModelProvider, [unknown]>();
const openaiMock = jest.fn<ModelProvider, [unknown]>();

jest.mock('@ayunis/provider-anthropic', () => ({
  anthropic: (options: unknown) => anthropicMock(options),
}));
jest.mock('@ayunis/provider-anthropic/bedrock', () => ({
  bedrock: (options: unknown) => bedrockMock(options),
}));
jest.mock('@ayunis/provider-gemini', () => ({
  gemini: (options: unknown) => geminiMock(options),
}));
jest.mock('@ayunis/provider-mistral', () => ({
  mistral: (options: unknown) => mistralMock(options),
}));
jest.mock('@ayunis/provider-ollama', () => ({
  ollama: (options: unknown) => ollamaMock(options),
}));
jest.mock('@ayunis/provider-openai', () => ({
  azure: (options: unknown) => azureMock(options),
  openai: (options: unknown) => openaiMock(options),
}));

type ProviderFactoryMock = jest.Mock<ModelProvider, [unknown]>;
type FactoryConstructor = new (configService: ConfigService) => object;
type CreateProvider = (model: Model) => ModelProvider;

const providerFactoryMocks = [
  anthropicMock,
  azureMock,
  bedrockMock,
  geminiMock,
  mistralMock,
  ollamaMock,
  openaiMock,
];

const factories: Array<{
  name: string;
  Factory: FactoryConstructor;
  providerFactory: ProviderFactoryMock;
}> = [
  {
    name: 'Anthropic',
    Factory: AnthropicInferenceProviderFactory,
    providerFactory: anthropicMock,
  },
  {
    name: 'Bedrock',
    Factory: BedrockInferenceProviderFactory,
    providerFactory: bedrockMock,
  },
  {
    name: 'Azure',
    Factory: AzureInferenceProviderFactory,
    providerFactory: azureMock,
  },
  {
    name: 'Gemini',
    Factory: GeminiInferenceProviderFactory,
    providerFactory: geminiMock,
  },
  {
    name: 'Mistral',
    Factory: MistralInferenceProviderFactory,
    providerFactory: mistralMock,
  },
  {
    name: 'OpenAI',
    Factory: OpenAIInferenceProviderFactory,
    providerFactory: openaiMock,
  },
  {
    name: 'OTC',
    Factory: OtcInferenceProviderFactory,
    providerFactory: openaiMock,
  },
  {
    name: 'STACKIT',
    Factory: StackitInferenceProviderFactory,
    providerFactory: openaiMock,
  },
  {
    name: 'Scaleway',
    Factory: ScalewayInferenceProviderFactory,
    providerFactory: openaiMock,
  },
  {
    name: 'local Ollama',
    Factory: LocalOllamaInferenceProviderFactory,
    providerFactory: ollamaMock,
  },
  {
    name: 'Ayunis Ollama',
    Factory: AyunisOllamaInferenceProviderFactory,
    providerFactory: ollamaMock,
  },
  {
    name: 'Synaforce',
    Factory: SynaforceInferenceProviderFactory,
    providerFactory: ollamaMock,
  },
];

const configService = {
  get: jest.fn().mockReturnValue('configured-value'),
} as unknown as ConfigService;
const model = { name: 'configured-model' } as Model;

function invokeCreateProvider(Factory: FactoryConstructor): void {
  const factory = new Factory(configService);
  const createProvider = (
    factory as unknown as { createProvider: CreateProvider }
  ).createProvider.bind(factory);

  createProvider(model);
}

describe('provider retry configuration', () => {
  beforeEach(() => {
    for (const providerFactoryMock of providerFactoryMocks) {
      providerFactoryMock.mockReset();
      providerFactoryMock.mockReturnValue({
        name: 'provider:test',
        stream: jest.fn(),
      });
    }
  });

  it.each(factories)(
    '$name provider disables SDK retries',
    ({ Factory, providerFactory }) => {
      invokeCreateProvider(Factory);

      expect(providerFactory).toHaveBeenLastCalledWith(
        expect.objectContaining({ maxRetries: 0 }),
      );
    },
  );
});
