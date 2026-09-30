import { Injectable } from '@nestjs/common';
import type {
  PrepareBulkInput,
  SearchInput,
  SearchMultiInput,
} from 'src/domain/rag/indexers/application/ports/indexer';
import { IndexerPort } from 'src/domain/rag/indexers/application/ports/indexer';
import type { IndexEntry } from 'src/domain/rag/indexers/domain/index-entry.entity';
import type { PreparedIndexContent } from 'src/domain/rag/indexers/domain/prepared-index-content.entity';
import { PreparedParentChildContent } from 'src/domain/rag/indexers/infrastructure/adapters/parent-child-index/domain/prepared-parent-child-content.entity';
import { PrepareBulkContentUseCase } from './use-cases/prepare-bulk-content/prepare-bulk-content.use-case';
import { PrepareBulkContentCommand } from './use-cases/prepare-bulk-content/prepare-bulk-content.command';
import { ReplaceContentUseCase } from './use-cases/replace-content/replace-content.use-case';
import { SearchContentUseCase } from './use-cases/search-content/search-content.use-case';
import type { UUID } from 'crypto';
import { DeleteContentUseCase } from './use-cases/delete-content/delete-content.use-case';
import { DeleteContentCommand } from './use-cases/delete-content/delete-content.command';
import { DeleteContentsUseCase } from './use-cases/delete-contents/delete-contents.use-case';
import { DeleteContentsCommand } from './use-cases/delete-contents/delete-contents.command';

@Injectable()
export class ParentChildIndexerAdapter extends IndexerPort {
  constructor(
    private readonly prepareBulkContentUseCase: PrepareBulkContentUseCase,
    private readonly replaceContentUseCase: ReplaceContentUseCase,
    private readonly searchContentUseCase: SearchContentUseCase,
    private readonly deleteContentUseCase: DeleteContentUseCase,
    private readonly deleteContentsUseCase: DeleteContentsUseCase,
  ) {
    super();
  }

  async prepareBulk(input: PrepareBulkInput): Promise<PreparedIndexContent> {
    return await this.prepareBulkContentUseCase.execute(
      new PrepareBulkContentCommand(input),
    );
  }

  async replace(prepared: PreparedIndexContent): Promise<void> {
    if (!(prepared instanceof PreparedParentChildContent)) {
      throw new Error(
        `Parent-child index cannot store ${prepared.type} content`,
      );
    }
    await this.replaceContentUseCase.execute(prepared);
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
