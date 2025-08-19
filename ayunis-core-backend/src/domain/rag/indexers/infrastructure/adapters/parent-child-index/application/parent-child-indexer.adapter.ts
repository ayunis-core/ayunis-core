import { Injectable } from '@nestjs/common';
import {
  IndexerPort,
  IngestInput,
  SearchInput,
} from 'src/domain/rag/indexers/application/ports/indexer';
import { IndexEntry } from 'src/domain/rag/indexers/domain/index-entry.entity';
import { IngestContentUseCase } from './use-cases/ingest-content/ingest-content.use-case';
import { SearchContentUseCase } from './use-cases/search-content/search-content.use-case';
import { UUID } from 'crypto';
import { DeleteContentUseCase } from './use-cases/delete-content/delete-content.use-case';
import { DeleteContentCommand } from './use-cases/delete-content/delete-content.command';

@Injectable()
export class ParentChildIndexerAdapter extends IndexerPort {
  constructor(
    private readonly ingestContentUseCase: IngestContentUseCase,
    private readonly searchContentUseCase: SearchContentUseCase,
    private readonly deleteContentUseCase: DeleteContentUseCase,
  ) {
    super();
  }

  async ingest(params: IngestInput): Promise<void> {
    await this.ingestContentUseCase.execute(params);
  }

  async search(input: SearchInput): Promise<IndexEntry[]> {
    return await this.searchContentUseCase.execute(input);
  }

  async delete(documentId: UUID): Promise<void> {
    await this.deleteContentUseCase.execute(
      new DeleteContentCommand({
        documentId,
      }),
    );
  }
}
