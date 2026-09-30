import type { UUID } from 'crypto';
import { IndexRegistry } from 'src/domain/rag/indexers/application/indexer.registry';
import type { IndexerPort } from 'src/domain/rag/indexers/application/ports/indexer';
import { UnexpectedIndexError } from 'src/domain/rag/indexers/application/indexer.errors';
import { IndexType } from 'src/domain/rag/indexers/domain/value-objects/index-type.enum';
import { PreparedParentChildContent } from 'src/domain/rag/indexers/infrastructure/adapters/parent-child-index/domain/prepared-parent-child-content.entity';
import { ReplaceBulkContentUseCase } from './replace-bulk-content.use-case';
import { ReplaceBulkContentCommand } from './replace-bulk-content.command';

const DOC_ID = '22222222-2222-2222-2222-222222222222' as UUID;

describe('ReplaceBulkContentUseCase', () => {
  let indexer: jest.Mocked<Pick<IndexerPort, 'replace'>>;
  let useCase: ReplaceBulkContentUseCase;

  beforeEach(() => {
    indexer = { replace: jest.fn().mockResolvedValue(undefined) };
    const registry = new IndexRegistry();
    registry.register(
      IndexType.PARENT_CHILD,
      indexer as unknown as IndexerPort,
    );
    useCase = new ReplaceBulkContentUseCase(registry);
  });

  it('hands the prepared content to the indexer that produced it', async () => {
    const prepared = new PreparedParentChildContent(DOC_ID, []);

    await useCase.execute(new ReplaceBulkContentCommand({ prepared }));

    expect(indexer.replace).toHaveBeenCalledWith(prepared);
  });

  it('wraps an unexpected storage failure', async () => {
    indexer.replace.mockRejectedValue(new Error('deadlock detected'));

    await expect(
      useCase.execute(
        new ReplaceBulkContentCommand({
          prepared: new PreparedParentChildContent(DOC_ID, []),
        }),
      ),
    ).rejects.toBeInstanceOf(UnexpectedIndexError);
  });
});
