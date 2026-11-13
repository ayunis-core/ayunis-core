import { Injectable } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { IndexRegistry } from 'src/domain/rag/indexers/application/indexer.registry';
import { UnexpectedIndexError } from 'src/domain/rag/indexers/application/indexer.errors';
import { PrepareContentEmbeddingsCommand } from './prepare-content-embeddings.command';
import type { PreparedContentEmbeddings } from 'src/domain/rag/indexers/application/models/prepared-content-embeddings';

/**
 * Computes the vectors a later IngestBulkContentUseCase call for these
 * contents needs, so the caller can do the embedding while it still waits
 * for the rest of a document. Nothing is stored; pass the result to the
 * ingestion.
 */
@Injectable()
export class PrepareContentEmbeddingsUseCase {
  constructor(private readonly indexRegistry: IndexRegistry) {}

  @HandleUnexpectedErrors(UnexpectedIndexError)
  async execute(
    command: PrepareContentEmbeddingsCommand,
  ): Promise<PreparedContentEmbeddings | undefined> {
    return this.indexRegistry.get(command.type).prepareEmbeddings({
      orgId: command.orgId,
      contents: command.contents,
    });
  }
}
