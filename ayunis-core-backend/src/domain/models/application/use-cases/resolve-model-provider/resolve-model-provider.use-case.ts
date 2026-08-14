import type { ModelProvider } from '@ayunis/inference';
import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
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
  constructor(
    @InjectPinoLogger(ResolveModelProviderUseCase.name)
    private readonly logger: PinoLogger,

    private readonly streamInferenceRegistry: StreamInferenceHandlerRegistry,
  ) {}

  @HandleUnexpectedErrors(UnexpectedModelError)
  execute(query: ResolveModelProviderQuery): Promise<ModelProvider> {
    this.logger.info(
      {
        model: query.model.name,
        provider: query.model.provider,
      },
      'Resolving model provider',
    );
    return Promise.resolve(
      this.streamInferenceRegistry
        .getHandler(query.model.provider)
        .resolveProvider(query.model),
    );
  }
}
