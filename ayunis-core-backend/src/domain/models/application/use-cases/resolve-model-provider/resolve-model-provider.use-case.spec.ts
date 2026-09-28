import type { ModelProvider as InferenceModelProvider } from '@ayunis/inference';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { InferenceProviderRegistry } from 'src/domain/models/application/registry/inference-provider.registry';
import { ResolveModelProviderQuery } from './resolve-model-provider.query';
import { ResolveModelProviderUseCase } from './resolve-model-provider.use-case';

describe('ResolveModelProviderUseCase', () => {
  let useCase: ResolveModelProviderUseCase;
  let registry: { resolve: jest.Mock };

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
    registry = { resolve: jest.fn() };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        ResolveModelProviderUseCase,
        { provide: InferenceProviderRegistry, useValue: registry },
      ],
    }).compile();

    useCase = moduleRef.get(ResolveModelProviderUseCase);
  });

  it('resolves the model through the shared inference provider registry', async () => {
    registry.resolve.mockReturnValue(fakeProvider);

    const result = await useCase.execute(new ResolveModelProviderQuery(model));

    expect(registry.resolve).toHaveBeenCalledWith(model);
    expect(result).toBe(fakeProvider);
  });
});
