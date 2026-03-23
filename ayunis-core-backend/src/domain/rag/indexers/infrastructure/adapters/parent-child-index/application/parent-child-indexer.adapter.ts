import { Injectable } from '@nestjs/common';
import type {
  IngestInput,
  IngestBulkInput,
  SearchInput,
  SearchMultiInput,
} from 'src/domain/rag/indexers/application/ports/indexer';
import { IndexerPort } from 'src/domain/rag/indexers/application/ports/indexer';
import type { IndexEntry } from 'src/domain/rag/indexers/domain/index-entry.entity';
import { IngestContentUseCase } from './use-cases/ingest-content/ingest-content.use-case';
import { IngestContentCommand } from './use-cases/ingest-content/ingest-content.command';
import { IngestBulkContentUseCase } from './use-cases/ingest-bulk-content/ingest-bulk-content.use-case';
import { IngestBulkContentCommand } from './use-cases/ingest-bulk-content/ingest-bulk-content.command';
import { SearchContentUseCase } from './use-cases/search-content/search-content.use-case';
import type { UUID } from 'crypto';
import { DeleteContentUseCase } from './use-cases/delete-content/delete-content.use-case';
import { DeleteContentCommand } from './use-cases/delete-content/delete-content.command';
import { DeleteContentsUseCase } from './use-cases/delete-contents/delete-contents.use-case';
import { DeleteContentsCommand } from './use-cases/delete-contents/delete-contents.command';

@Injectable()
export class ParentChildIndexerAdapter extends IndexerPort {
  constructor(
    private readonly ingestContentUseCase: IngestContentUseCase,
    private readonly ingestBulkContentUseCase: IngestBulkContentUseCase,
    private readonly searchContentUseCase: SearchContentUseCase,
    private readonly deleteContentUseCase: DeleteContentUseCase,
    private readonly deleteContentsUseCase: DeleteContentsUseCase,
  ) {
    super();
  }

  async ingest(params: IngestInput): Promise<void> {
    await this.ingestContentUseCase.execute(
      new IngestContentCommand({
        orgId: params.orgId,
        indexEntry: params.indexEntry,
        content: params.content,
      }),
    );
  }

  async ingestBulk(params: IngestBulkInput): Promise<void> {
    await this.ingestBulkContentUseCase.execute(
      new IngestBulkContentCommand({
        orgId: params.orgId,
        entries: params.entries.map((entry) => ({
          indexEntry: entry.indexEntry,
          content: entry.content,
        })),
      }),
    );
  }

  async search(input: SearchInput): Promise<IndexEntry[]> {
    return await this.searchContentUseCase.execute(input);
  }

  async searchMulti(input: SearchMultiInput): Promise<IndexEntry[]> {
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
