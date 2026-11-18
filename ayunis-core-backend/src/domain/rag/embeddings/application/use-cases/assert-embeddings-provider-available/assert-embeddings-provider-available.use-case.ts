import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { EmbeddingsHandlerRegistry } from 'src/domain/rag/embeddings/application/embeddings-handler.registry';
import { UnexpectedEmbeddingsError } from 'src/domain/rag/embeddings/application/embeddings.errors';
import type { AssertEmbeddingsProviderAvailableQuery } from './assert-embeddings-provider-available.query';

/**
 * Throws `EmbeddingsProviderNotFoundError` or
 * `NoEmbeddingsProviderAvailableError` when an embed with this provider would
 * fail for lack of a configured handler.
 */
@Injectable()
export class AssertEmbeddingsProviderAvailableUseCase {
  private readonly logger = new Logger(
    AssertEmbeddingsProviderAvailableUseCase.name,
  );

  constructor(private readonly providerRegistry: EmbeddingsHandlerRegistry) {}

  @HandleUnexpectedErrors(UnexpectedEmbeddingsError)
  execute(query: AssertEmbeddingsProviderAvailableQuery): Promise<void> {
    this.logger.debug({ provider: query.provider }, 'execute');
    this.providerRegistry.getHandler(query.provider);
    return Promise.resolve();
  }
}
