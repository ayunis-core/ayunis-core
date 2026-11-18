import type { UUID } from 'crypto';
import { PermittedEmbeddingModelNotFoundForOrgError } from 'src/domain/models/application/models.errors';
import type { GetPermittedEmbeddingModelUseCase } from 'src/domain/models/application/use-cases/get-permitted-embedding-model/get-permitted-embedding-model.use-case';
import { createMockSourceReindexRepository } from 'src/domain/sources/application/testing/source.fixtures';
import { SourceReindexScheduler } from './source-reindex-scheduler.service';

const SOURCE_ID = '11111111-1111-1111-1111-111111111111' as UUID;
const ORG_ID = '22222222-2222-2222-2222-222222222222' as UUID;
const CURRENT_MODEL_ID = '33333333-3333-3333-3333-333333333333' as UUID;

describe('SourceReindexScheduler', () => {
  function setup() {
    const repository = createMockSourceReindexRepository();
    const queue = { enqueue: jest.fn().mockResolvedValue(undefined) };
    const getModel = {
      execute: jest.fn().mockResolvedValue({ model: { id: CURRENT_MODEL_ID } }),
    };
    const scheduler = new SourceReindexScheduler(
      repository,
      queue,
      getModel as unknown as GetPermittedEmbeddingModelUseCase,
    );
    return { repository, queue, getModel, scheduler };
  }

  it('re-indexes a source that finished indexing with a model replaced meanwhile', async () => {
    const { repository, queue, scheduler } = setup();
    repository.flagIfIndexedWithOtherModel.mockResolvedValue(true);

    await scheduler.reindexIfModelChanged(SOURCE_ID, ORG_ID);

    expect(repository.flagIfIndexedWithOtherModel).toHaveBeenCalledWith(
      SOURCE_ID,
      CURRENT_MODEL_ID,
    );
    expect(queue.enqueue).toHaveBeenCalledWith(ORG_ID, [SOURCE_ID]);
  });

  it('leaves the source ready while the org has no embedding model', async () => {
    const { repository, queue, getModel, scheduler } = setup();
    getModel.execute.mockRejectedValue(
      new PermittedEmbeddingModelNotFoundForOrgError(ORG_ID),
    );

    await scheduler.reindexIfModelChanged(SOURCE_ID, ORG_ID);

    expect(repository.flagIfIndexedWithOtherModel).not.toHaveBeenCalled();
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it('never fails the ready source it was asked about', async () => {
    const { queue, repository, scheduler } = setup();
    repository.flagIfIndexedWithOtherModel.mockResolvedValue(true);
    queue.enqueue.mockRejectedValue(new Error('Redis unavailable'));

    await expect(
      scheduler.reindexIfModelChanged(SOURCE_ID, ORG_ID),
    ).resolves.toBeUndefined();
  });
});
