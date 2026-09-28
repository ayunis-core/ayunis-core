import type { ConfigService } from '@nestjs/config';
import type { ModelProvider } from '@ayunis/inference';
import { AnthropicStreamInferenceHandler } from './anthropic.stream-inference';
import { AyunisOllamaStreamInferenceHandler } from './ayunis-ollama.stream-inference';
import { AzureStreamInferenceHandler } from './azure.stream-inference';
import { BedrockStreamInferenceHandler } from './bedrock.stream-inference';
import { GeminiStreamInferenceHandler } from './gemini.stream-inference';
import { LocalOllamaStreamInferenceHandler } from './local-ollama.stream-inference';
import { MistralStreamInferenceHandler } from './mistral.stream-inference';
import { OpenAIStreamInferenceHandler } from './openai.stream-inference';
import { OtcStreamInferenceHandler } from './otc.stream-inference';
import { ScalewayStreamInferenceHandler } from './scaleway.stream-inference';
import { StackitStreamInferenceHandler } from './stackit.stream-inference';
import { SynaforceStreamInferenceHandler } from './synaforce.stream-inference';
import { AnthropicInferenceHandler } from 'src/domain/models/infrastructure/inference/anthropic.inference';
import { AyunisOllamaInferenceHandler } from 'src/domain/models/infrastructure/inference/ayunis-ollama.inference';
import { AzureInferenceHandler } from 'src/domain/models/infrastructure/inference/azure.inference';
import { BedrockInferenceHandler } from 'src/domain/models/infrastructure/inference/bedrock.inference';
import { GeminiInferenceHandler } from 'src/domain/models/infrastructure/inference/gemini.inference';
import { LocalOllamaInferenceHandler } from 'src/domain/models/infrastructure/inference/local-ollama.inference';
import { MistralInferenceHandler } from 'src/domain/models/infrastructure/inference/mistral.inference';
import { OpenAIInferenceHandler } from 'src/domain/models/infrastructure/inference/openai.inference';
import { OtcInferenceHandler } from 'src/domain/models/infrastructure/inference/otc.inference';
import { ScalewayInferenceHandler } from 'src/domain/models/infrastructure/inference/scaleway.inference';
import { StackitInferenceHandler } from 'src/domain/models/infrastructure/inference/stackit.inference';
import { SynaforceInferenceHandler } from 'src/domain/models/infrastructure/inference/synaforce.inference';
import type { ImageContentService } from 'src/domain/messages/application/services/image-content.service';
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
type HandlerConstructor = new (
  configService: ConfigService,
  imageContentService: ImageContentService,
) => object;
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

const streamingHandlers: Array<{
  name: string;
  Handler: HandlerConstructor;
  providerFactory: ProviderFactoryMock;
}> = [
  {
    name: 'Anthropic',
    Handler: AnthropicStreamInferenceHandler,
    providerFactory: anthropicMock,
  },
  {
    name: 'Bedrock',
    Handler: BedrockStreamInferenceHandler,
    providerFactory: bedrockMock,
  },
  {
    name: 'Azure',
    Handler: AzureStreamInferenceHandler,
    providerFactory: azureMock,
  },
  {
    name: 'Gemini',
    Handler: GeminiStreamInferenceHandler,
    providerFactory: geminiMock,
  },
  {
    name: 'Mistral',
    Handler: MistralStreamInferenceHandler,
    providerFactory: mistralMock,
  },
  {
    name: 'OpenAI',
    Handler: OpenAIStreamInferenceHandler,
    providerFactory: openaiMock,
  },
  {
    name: 'OTC',
    Handler: OtcStreamInferenceHandler,
    providerFactory: openaiMock,
  },
  {
    name: 'STACKIT',
    Handler: StackitStreamInferenceHandler,
    providerFactory: openaiMock,
  },
  {
    name: 'Scaleway',
    Handler: ScalewayStreamInferenceHandler,
    providerFactory: openaiMock,
  },
  {
    name: 'local Ollama',
    Handler: LocalOllamaStreamInferenceHandler,
    providerFactory: ollamaMock,
  },
  {
    name: 'Ayunis Ollama',
    Handler: AyunisOllamaStreamInferenceHandler,
    providerFactory: ollamaMock,
  },
  {
    name: 'Synaforce',
    Handler: SynaforceStreamInferenceHandler,
    providerFactory: ollamaMock,
  },
];

const nonStreamingHandlers: typeof streamingHandlers = [
  {
    name: 'Anthropic',
    Handler: AnthropicInferenceHandler,
    providerFactory: anthropicMock,
  },
  {
    name: 'Bedrock',
    Handler: BedrockInferenceHandler,
    providerFactory: bedrockMock,
  },
  { name: 'Azure', Handler: AzureInferenceHandler, providerFactory: azureMock },
  {
    name: 'Gemini',
    Handler: GeminiInferenceHandler,
    providerFactory: geminiMock,
  },
  {
    name: 'Mistral',
    Handler: MistralInferenceHandler,
    providerFactory: mistralMock,
  },
  {
    name: 'OpenAI',
    Handler: OpenAIInferenceHandler,
    providerFactory: openaiMock,
  },
  { name: 'OTC', Handler: OtcInferenceHandler, providerFactory: openaiMock },
  {
    name: 'STACKIT',
    Handler: StackitInferenceHandler,
    providerFactory: openaiMock,
  },
  {
    name: 'Scaleway',
    Handler: ScalewayInferenceHandler,
    providerFactory: openaiMock,
  },
  {
    name: 'local Ollama',
    Handler: LocalOllamaInferenceHandler,
    providerFactory: ollamaMock,
  },
  {
    name: 'Ayunis Ollama',
    Handler: AyunisOllamaInferenceHandler,
    providerFactory: ollamaMock,
  },
  {
    name: 'Synaforce',
    Handler: SynaforceInferenceHandler,
    providerFactory: ollamaMock,
  },
];

const configService = {
  get: jest.fn().mockReturnValue('configured-value'),
} as unknown as ConfigService;
const imageContentService = {} as ImageContentService;
const model = { name: 'configured-model' } as Model;

function invokeCreateProvider(Handler: HandlerConstructor): void {
  const handler = new Handler(configService, imageContentService);
  const createProvider = (
    handler as unknown as { createProvider: CreateProvider }
  ).createProvider.bind(handler);

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

  it.each(streamingHandlers)(
    '$name streaming handler disables provider retries',
    ({ Handler, providerFactory }) => {
      invokeCreateProvider(Handler);

      expect(providerFactory).toHaveBeenLastCalledWith(
        expect.objectContaining({ maxRetries: 0 }),
      );
    },
  );

  it.each(nonStreamingHandlers)(
    '$name non-streaming handler disables provider retries',
    ({ Handler, providerFactory }) => {
      invokeCreateProvider(Handler);

      expect(providerFactory).toHaveBeenLastCalledWith(
        expect.objectContaining({ maxRetries: 0 }),
      );
    },
  );
});
