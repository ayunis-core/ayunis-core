import type { ModelProvider as InferenceProvider } from '@ayunis/inference';
import type { ConfigService } from '@nestjs/config';
import { ModelProviderNotSupportedError } from 'src/domain/models/application/models.errors';
import type { InferenceProviderFactory } from 'src/domain/models/application/ports/inference-provider.factory';
import type { Model } from 'src/domain/models/domain/model.entity';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { InferenceProviderRegistry } from './inference-provider.registry';

function factoryReturning(name: string): InferenceProviderFactory {
  const provider: InferenceProvider = { name, stream: jest.fn() };
  return { resolveProvider: jest.fn(() => provider) };
}

function registryWith(mockInference: boolean): InferenceProviderRegistry {
  const configService = {
    get: jest.fn((key: string) =>
      key === 'app.mockInference' ? mockInference : undefined,
    ),
  } as unknown as ConfigService;
  const registry = new InferenceProviderRegistry(configService);
  registry.register(ModelProvider.MISTRAL, factoryReturning('mistral'));
  registry.registerMockFactory(factoryReturning('mock'));
  return registry;
}

const mistralModel = { provider: ModelProvider.MISTRAL } as Model;

describe('InferenceProviderRegistry', () => {
  it('resolves a model through the factory registered for its provider', () => {
    expect(registryWith(false).resolve(mistralModel).name).toBe('mistral');
  });

  it('rejects a provider without a registered factory', () => {
    expect(() =>
      registryWith(false).resolve({ provider: ModelProvider.OPENAI } as Model),
    ).toThrow(ModelProviderNotSupportedError);
  });

  it.each([ModelProvider.MISTRAL, ModelProvider.OPENAI])(
    'resolves %s models to the mock provider when mock inference is enabled',
    (provider) => {
      expect(registryWith(true).resolve({ provider } as Model).name).toBe(
        'mock',
      );
    },
  );
});
