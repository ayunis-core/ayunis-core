jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () =>
    (_target: unknown, _propertyName: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

import type { UUID } from 'crypto';
import { PermittedEmbeddingModelNotFoundForOrgError } from 'src/domain/models/application/models.errors';
import { EmbeddingPriority } from 'src/domain/rag/embeddings/domain/embedding-priority.enum';
import type { DeleteContentUseCase } from 'src/domain/rag/indexers/application/use-cases/delete-content/delete-content.use-case';
import type { IngestBulkContentUseCase } from 'src/domain/rag/indexers/application/use-cases/ingest-bulk-content/ingest-bulk-content.use-case';
import type { PrepareContentEmbeddingsUseCase } from 'src/domain/rag/indexers/application/use-cases/prepare-content-embeddings/prepare-content-embeddings.use-case';
import { createMockSourceReindexRepository } from 'src/domain/sources/application/testing/source.fixtures';
import { TextSourceContentChunk } from 'src/domain/sources/domain/source-content-chunk.entity';
import type { SourceReindexScheduler } from './source-reindex-scheduler.service';
import { SourceReindexer } from './source-reindexer.service';

const SOURCE_ID = '11111111-1111-1111-1111-111111111111' as UUID;
const ORG_ID = '22222222-2222-2222-2222-222222222222' as UUID;
const NEW_MODEL_ID = '33333333-3333-3333-3333-333333333333' as UUID;

describe('SourceReindexer', () => {
  const transcript = new TextSourceContentChunk({
    content: 'Sprecher 1: Wir beschließen den Haushalt.',
    meta: {},
  });
  const summary = new TextSourceContentChunk({
    content: '## Beschlüsse',
    meta: { kind: 'summary' },
  });

  function setup() {
    const repository = createMockSourceReindexRepository();
    repository.findContentChunks.mockResolvedValue([transcript]);
    const prepare = { execute: jest.fn().mockResolvedValue(undefined) };
    const deleteContent = { execute: jest.fn().mockResolvedValue(undefined) };
    const ingest = { execute: jest.fn().mockResolvedValue(NEW_MODEL_ID) };
    const scheduler = {
      reindexIfModelChanged: jest.fn().mockResolvedValue(undefined),
    };
    const reindexer = new SourceReindexer(
      repository,
      prepare as unknown as PrepareContentEmbeddingsUseCase,
      deleteContent as unknown as DeleteContentUseCase,
      ingest as unknown as IngestBulkContentUseCase,
      scheduler as unknown as SourceReindexScheduler,
    );
    return { repository, prepare, deleteContent, ingest, scheduler, reindexer };
  }

  it('replaces the index with the new model, below uploads, and records that model', async () => {
    const { repository, ingest, prepare, reindexer } = setup();

    await expect(reindexer.reindex(SOURCE_ID, ORG_ID)).resolves.toBe(
      'reindexed',
    );

    expect(prepare.execute).toHaveBeenCalledWith(
      expect.objectContaining({ priority: EmbeddingPriority.REINDEXING }),
    );
    expect(ingest.execute).toHaveBeenCalledWith(
      expect.objectContaining({ priority: EmbeddingPriority.REINDEXING }),
    );
    expect(repository.completeReindex).toHaveBeenCalledWith(
      SOURCE_ID,
      NEW_MODEL_ID,
    );
  });

  it('also indexes a transcript summary added while the vectors were computed', async () => {
    const { repository, ingest, reindexer } = setup();
    repository.findContentChunks
      .mockResolvedValueOnce([transcript])
      .mockResolvedValueOnce([transcript, summary]);

    await reindexer.reindex(SOURCE_ID, ORG_ID);

    const [command] = ingest.execute.mock.calls[0] as [
      { entries: { chunkId: UUID }[] },
    ];
    expect(command.entries.map((entry) => entry.chunkId)).toEqual([
      transcript.id,
      summary.id,
    ]);
  });

  it('leaves a source deleted or settled meanwhile alone', async () => {
    const { repository, deleteContent, ingest, reindexer } = setup();
    repository.lockReindexing.mockResolvedValue(false);

    await expect(reindexer.reindex(SOURCE_ID, ORG_ID)).resolves.toBe('skipped');

    expect(deleteContent.execute).not.toHaveBeenCalled();
    expect(ingest.execute).not.toHaveBeenCalled();
  });

  it('keeps the previous index and waits for the next model when the model was removed again', async () => {
    const { repository, prepare, deleteContent, reindexer } = setup();
    prepare.execute.mockRejectedValue(
      new PermittedEmbeddingModelNotFoundForOrgError(ORG_ID),
    );

    await expect(reindexer.reindex(SOURCE_ID, ORG_ID)).resolves.toBe(
      'no_model',
    );

    expect(deleteContent.execute).not.toHaveBeenCalled();
    expect(repository.releaseReindexing).toHaveBeenCalledWith(SOURCE_ID);
  });

  it('flags the released source again when a model was permitted since it found none', async () => {
    const { repository, prepare, scheduler, reindexer } = setup();
    prepare.execute.mockRejectedValue(
      new PermittedEmbeddingModelNotFoundForOrgError(ORG_ID),
    );

    await reindexer.reindex(SOURCE_ID, ORG_ID);

    expect(
      repository.releaseReindexing.mock.invocationCallOrder[0],
    ).toBeLessThan(scheduler.reindexIfModelChanged.mock.invocationCallOrder[0]);
  });
});
