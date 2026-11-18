import type { UUID } from 'crypto';
import { PermittedEmbeddingModelNotFoundForOrgError } from 'src/domain/models/application/models.errors';
import type { DeleteContentUseCase } from 'src/domain/rag/indexers/application/use-cases/delete-content/delete-content.use-case';
import type { IngestBulkContentUseCase } from 'src/domain/rag/indexers/application/use-cases/ingest-bulk-content/ingest-bulk-content.use-case';
import type { MarkSourceFailedUseCase } from 'src/domain/sources/application/use-cases/mark-source-failed/mark-source-failed.use-case';
import { createMockSourceReindexRepository } from 'src/domain/sources/application/testing/source.fixtures';
import { TextSourceContentChunk } from 'src/domain/sources/domain/source-content-chunk.entity';
import type { SourceReindexScheduler } from './source-reindex-scheduler.service';
import { SourceProcessingHelper } from './source-processing-helper.service';

const SOURCE_ID = '11111111-1111-1111-1111-111111111111' as UUID;
const ORG_ID = '22222222-2222-2222-2222-222222222222' as UUID;
const MODEL_ID = '33333333-3333-3333-3333-333333333333' as UUID;

describe('SourceProcessingHelper.index', () => {
  function setup() {
    const reindexRepository = createMockSourceReindexRepository();
    const ingest = { execute: jest.fn().mockResolvedValue(MODEL_ID) };
    const helper = new SourceProcessingHelper(
      ingest as unknown as IngestBulkContentUseCase,
      { execute: jest.fn() } as unknown as DeleteContentUseCase,
      {} as MarkSourceFailedUseCase,
      reindexRepository,
      {} as SourceReindexScheduler,
    );
    const chunks = [
      new TextSourceContentChunk({ content: 'Gebührensatzung', meta: {} }),
    ];
    return { reindexRepository, ingest, helper, chunks };
  }

  it('records the embedding model the source was indexed with', async () => {
    const { reindexRepository, helper, chunks } = setup();

    await helper.index(SOURCE_ID, ORG_ID, chunks);

    expect(reindexRepository.recordEmbeddingModel).toHaveBeenCalledWith(
      SOURCE_ID,
      MODEL_ID,
    );
  });

  it('keeps a document whose model was removed mid-processing, unindexed until the next model', async () => {
    const { reindexRepository, ingest, helper, chunks } = setup();
    ingest.execute.mockRejectedValue(
      new PermittedEmbeddingModelNotFoundForOrgError(ORG_ID),
    );

    await expect(
      helper.index(SOURCE_ID, ORG_ID, chunks),
    ).resolves.toBeUndefined();

    expect(reindexRepository.recordEmbeddingModel).toHaveBeenCalledWith(
      SOURCE_ID,
      null,
    );
  });
});
