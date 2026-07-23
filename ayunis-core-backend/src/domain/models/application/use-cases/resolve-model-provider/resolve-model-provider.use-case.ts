import type { ModelProvider } from '@ayunis/inference';
import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { StreamInferenceHandlerRegistry } from '../../registry/stream-inference-handler.registry';
import { UnexpectedModelError } from '../../models.errors';
import { ResolveModelProviderQuery } from './resolve-model-provider.query';

/**
 * Resolves the credentialed `@ayunis/inference` provider for a model — the
 * host-side "provider id + key → provider instance" factory the agent runtime
 * needs for `run({ model })`. Selection/credentials stay in the host; the
 * shipped provider packages own the wire format.
 */
@Injectable()
export class ResolveModelProviderUseCase {
  private readonly logger = new Logger(ResolveModelProviderUseCase.name);

  constructor(
    private readonly streamInferenceRegistry: StreamInferenceHandlerRegistry,
  ) {}

  @HandleUnexpectedErrors(UnexpectedModelError)
  execute(query: ResolveModelProviderQuery): Promise<ModelProvider> {
    this.logger.log('Resolving model provider', {
      model: query.model.name,
      provider: query.model.provider,
    });
    return Promise.resolve(
      this.streamInferenceRegistry
        .getHandler(query.model.provider)
        .resolveProvider(query.model),
    );
  }
}
