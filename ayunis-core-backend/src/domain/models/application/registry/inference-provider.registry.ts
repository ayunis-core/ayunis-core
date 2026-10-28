import type { ModelProvider as InferenceProvider } from '@ayunis/inference';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModelProviderNotSupportedError } from 'src/domain/models/application/models.errors';
import type { InferenceProviderFactory } from 'src/domain/models/application/ports/inference-provider.factory';
import type { Model } from 'src/domain/models/domain/model.entity';
import type { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';

/**
 * The single place a model is resolved to its `@ayunis/inference` provider,
 * shared by direct inference and the agent runtime. Factories are registered
 * in models.module.ts.
 */
@Injectable()
export class InferenceProviderRegistry {
  private readonly factories = new Map<
    ModelProvider,
    InferenceProviderFactory
  >();
  private mockFactory: InferenceProviderFactory;

  constructor(private readonly configService: ConfigService) {}

  register(provider: ModelProvider, factory: InferenceProviderFactory): void {
    this.factories.set(provider, factory);
  }

  registerMockFactory(factory: InferenceProviderFactory): void {
    this.mockFactory = factory;
  }

  /**
   * With mock inference enabled (NODE_ENV=test or MOCK_INFERENCE=true, e.g.
   * e2e stacks) every model resolves to the deterministic, cost-free mock so
   * no external API is called and no API keys are needed.
   */
  resolve(model: Model): InferenceProvider {
    if (this.configService.get<boolean>('app.mockInference')) {
      return this.mockFactory.resolveProvider(model);
    }
    const factory = this.factories.get(model.provider);
    if (!factory) {
      throw new ModelProviderNotSupportedError(model.provider);
    }
    return factory.resolveProvider(model);
  }
}
