import type { ModelProvider as InferenceModelProvider } from '@ayunis/inference';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { StreamInferenceHandlerRegistry } from '../../registry/stream-inference-handler.registry';
import { ResolveModelProviderQuery } from './resolve-model-provider.query';
import { ResolveModelProviderUseCase } from './resolve-model-provider.use-case';

describe('ResolveModelProviderUseCase', () => {
  let useCase: ResolveModelProviderUseCase;
  let registry: { getHandler: jest.Mock };

  const model = new LanguageModel({
    name: 'claude-sonnet-4-5',
    provider: ModelProvider.ANTHROPIC,
    displayName: 'Claude Sonnet 4.5',
    canStream: true,
    canUseTools: true,
    isReasoning: false,
    canVision: true,
    isArchived: false,
  });

  const fakeProvider: InferenceModelProvider = {
    name: 'anthropic::claude-sonnet-4-5',
    stream: function () {
      return (async function* () {
        yield { textDelta: 'ok', finishReason: 'stop' as const };
      })();
    },
  };

  beforeEach(async () => {
    registry = { getHandler: jest.fn() };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        ResolveModelProviderUseCase,
        { provide: StreamInferenceHandlerRegistry, useValue: registry },
      ],
    }).compile();

    useCase = moduleRef.get(ResolveModelProviderUseCase);
  });

  it('resolves the provider from the handler for the model provider', async () => {
    const resolveProvider = jest.fn().mockReturnValue(fakeProvider);
    registry.getHandler.mockReturnValue({ resolveProvider });

    const result = await useCase.execute(new ResolveModelProviderQuery(model));

    expect(registry.getHandler).toHaveBeenCalledWith(ModelProvider.ANTHROPIC);
    expect(resolveProvider).toHaveBeenCalledWith(model);
    expect(result).toBe(fakeProvider);
  });
});
