import type { ModelProvider } from '@ayunis/inference';
import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { InferenceProviderRegistry } from 'src/domain/models/application/registry/inference-provider.registry';
import { UnexpectedModelError } from 'src/domain/models/application/models.errors';
import { ResolveModelProviderQuery } from './resolve-model-provider.query';

/**
 * Resolves the credentialed `@ayunis/inference` provider for a model — the
 * host-side "provider id + key → provider instance" factory the agent runtime
 * needs for `run({ model })`. It is the same provider direct inference uses;
 * the agent runtime drives the stream and owns retries.
 */
@Injectable()
export class ResolveModelProviderUseCase {
  private readonly logger = new Logger(ResolveModelProviderUseCase.name);

  constructor(
    private readonly inferenceProviderRegistry: InferenceProviderRegistry,
  ) {}

  @HandleUnexpectedErrors(UnexpectedModelError)
  execute(query: ResolveModelProviderQuery): Promise<ModelProvider> {
    this.logger.log(
      {
        model: query.model.name,
        provider: query.model.provider,
      },
      'Resolving model provider',
    );
    return Promise.resolve(this.inferenceProviderRegistry.resolve(query.model));
  }
}
