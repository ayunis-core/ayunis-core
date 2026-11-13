import { Injectable } from '@nestjs/common';
import type {
  IngestBulkInput,
  PrepareEmbeddingsInput,
  SearchMultiInput,
} from 'src/domain/rag/indexers/application/ports/indexer';
import { IndexerPort } from 'src/domain/rag/indexers/application/ports/indexer';
import type { IndexMatch } from 'src/domain/rag/indexers/domain/index-match.entity';
import { IngestBulkContentUseCase } from './use-cases/ingest-bulk-content/ingest-bulk-content.use-case';
import { IngestBulkContentCommand } from './use-cases/ingest-bulk-content/ingest-bulk-content.command';
import { PrepareEmbeddingsUseCase } from './use-cases/prepare-embeddings/prepare-embeddings.use-case';
import { PrepareEmbeddingsCommand } from './use-cases/prepare-embeddings/prepare-embeddings.command';
import { SearchContentUseCase } from './use-cases/search-content/search-content.use-case';
import type { UUID } from 'crypto';
import { DeleteContentUseCase } from './use-cases/delete-content/delete-content.use-case';
import { DeleteContentCommand } from './use-cases/delete-content/delete-content.command';
import { DeleteContentsUseCase } from './use-cases/delete-contents/delete-contents.use-case';
import { DeleteContentsCommand } from './use-cases/delete-contents/delete-contents.command';
import type { PreparedContentEmbeddings } from 'src/domain/rag/indexers/application/models/prepared-content-embeddings';

@Injectable()
export class ParentChildIndexerAdapter extends IndexerPort {
  constructor(
    private readonly ingestBulkContentUseCase: IngestBulkContentUseCase,
    private readonly prepareEmbeddingsUseCase: PrepareEmbeddingsUseCase,
    private readonly searchContentUseCase: SearchContentUseCase,
    private readonly deleteContentUseCase: DeleteContentUseCase,
    private readonly deleteContentsUseCase: DeleteContentsUseCase,
  ) {
    super();
  }

  async ingestBulk(params: IngestBulkInput): Promise<void> {
    await this.ingestBulkContentUseCase.execute(
      new IngestBulkContentCommand({
        orgId: params.orgId,
        entries: params.entries.map((entry) => ({
          indexEntry: entry.indexEntry,
          content: entry.content,
        })),
        precomputedEmbeddings: params.precomputedEmbeddings,
      }),
    );
  }

  prepareEmbeddings(
    input: PrepareEmbeddingsInput,
  ): Promise<PreparedContentEmbeddings | undefined> {
    return this.prepareEmbeddingsUseCase.execute(
      new PrepareEmbeddingsCommand(input),
    );
  }

  async searchMulti(input: SearchMultiInput): Promise<IndexMatch[]> {
    return await this.searchContentUseCase.executeMulti(input);
  }

  async delete(documentId: UUID): Promise<void> {
    await this.deleteContentUseCase.execute(
      new DeleteContentCommand({
        documentId,
      }),
    );
  }

  async deleteMany(documentIds: UUID[]): Promise<void> {
    await this.deleteContentsUseCase.execute(
      new DeleteContentsCommand({
        documentIds,
      }),
    );
  }
}
