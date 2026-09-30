import type { UUID } from 'crypto';
import { PreparedIndexContent } from 'src/domain/rag/indexers/domain/prepared-index-content.entity';
import type { IndexType } from 'src/domain/rag/indexers/domain/value-objects/index-type.enum';
import { PreparedParentChildContent } from 'src/domain/rag/indexers/infrastructure/adapters/parent-child-index/domain/prepared-parent-child-content.entity';
import { ParentChildIndexerAdapter } from './parent-child-indexer.adapter';
import type { PrepareBulkContentUseCase } from './use-cases/prepare-bulk-content/prepare-bulk-content.use-case';
import type { ReplaceContentUseCase } from './use-cases/replace-content/replace-content.use-case';
import type { SearchContentUseCase } from './use-cases/search-content/search-content.use-case';
import type { DeleteContentUseCase } from './use-cases/delete-content/delete-content.use-case';
import type { DeleteContentsUseCase } from './use-cases/delete-contents/delete-contents.use-case';

const DOC_ID = '22222222-2222-2222-2222-222222222222' as UUID;

class ForeignPreparedContent extends PreparedIndexContent {}

describe('ParentChildIndexerAdapter', () => {
  const replaceContentUseCase = { execute: jest.fn() };
  const adapter = new ParentChildIndexerAdapter(
    {} as PrepareBulkContentUseCase,
    replaceContentUseCase as unknown as ReplaceContentUseCase,
    {} as SearchContentUseCase,
    {} as DeleteContentUseCase,
    {} as DeleteContentsUseCase,
  );

  beforeEach(() => jest.clearAllMocks());

  it('stores content it prepared itself', async () => {
    const prepared = new PreparedParentChildContent(DOC_ID, []);

    await adapter.replace(prepared);

    expect(replaceContentUseCase.execute).toHaveBeenCalledWith(prepared);
  });

  it('refuses content prepared by another indexer without writing', async () => {
    await expect(
      adapter.replace(new ForeignPreparedContent('bm25' as IndexType, DOC_ID)),
    ).rejects.toThrow('cannot store bm25 content');

    expect(replaceContentUseCase.execute).not.toHaveBeenCalled();
  });
});
