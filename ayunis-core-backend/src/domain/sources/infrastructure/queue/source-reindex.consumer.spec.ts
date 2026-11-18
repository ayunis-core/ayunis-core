import type { Job } from 'bullmq';
import type { UUID } from 'crypto';
import { ProviderServerError } from 'src/common/errors/provider.errors';
import type { SourceReindexJobData } from 'src/domain/sources/application/ports/source-reindex-processing.port';
import type { SourceProcessingHelper } from 'src/domain/sources/application/services/source-processing-helper.service';
import type { SourceReindexScheduler } from 'src/domain/sources/application/services/source-reindex-scheduler.service';
import type { SourceReindexer } from 'src/domain/sources/application/services/source-reindexer.service';
import { createMockSourceReindexRepository } from 'src/domain/sources/application/testing/source.fixtures';
import { SourceProcessingErrorCode } from 'src/domain/sources/domain/source-processing-error-code.enum';
import { SourceReindexConsumer } from './source-reindex.consumer';

const SOURCE_ID = '11111111-1111-1111-1111-111111111111' as UUID;
const ORG_ID = '22222222-2222-2222-2222-222222222222' as UUID;
const OLD_MODEL_ID = '33333333-3333-3333-3333-333333333333' as UUID;
const NEW_MODEL_ID = '44444444-4444-4444-4444-444444444444' as UUID;

describe('SourceReindexConsumer', () => {
  function setup(attemptsMade: number) {
    const repository = createMockSourceReindexRepository();
    const reindexer = {
      reindex: jest
        .fn()
        .mockRejectedValue(
          new ProviderServerError({ provider: 'mistral', upstreamStatus: 503 }),
        ),
    };
    const helper = { cleanupIndex: jest.fn().mockResolvedValue(undefined) };
    const scheduler = {
      currentModelId: jest.fn().mockResolvedValue(OLD_MODEL_ID),
    };
    const consumer = new SourceReindexConsumer(
      {
        run: (fn: () => Promise<void>) => fn(),
        set: jest.fn(),
      } as never,
      { execute: jest.fn().mockResolvedValue(true) } as never,
      reindexer as unknown as SourceReindexer,
      repository,
      helper as unknown as SourceProcessingHelper,
      scheduler as unknown as SourceReindexScheduler,
    );
    const job = {
      id: SOURCE_ID,
      data: { sourceId: SOURCE_ID, orgId: ORG_ID },
      attemptsMade,
      opts: { attempts: 3 },
    } as unknown as Job<SourceReindexJobData>;
    return { repository, reindexer, helper, scheduler, consumer, job };
  }

  it('retries a failed re-index while attempts remain, without failing the source', async () => {
    const { repository, consumer, job } = setup(0);

    await expect(consumer.process(job)).rejects.toMatchObject({
      name: 'JobRetryScheduledError',
    });
    expect(repository.failReindex).not.toHaveBeenCalled();
  });

  it('fails the source with its error code after the last attempt, keeping its text', async () => {
    const { repository, helper, consumer, job } = setup(2);

    await expect(consumer.process(job)).rejects.toBeInstanceOf(
      ProviderServerError,
    );
    expect(repository.failReindex).toHaveBeenCalledWith(SOURCE_ID, {
      message: expect.any(String),
      code: SourceProcessingErrorCode.PROCESSING_UNAVAILABLE,
    });
    expect(helper.cleanupIndex).toHaveBeenCalledWith(SOURCE_ID);
  });

  it('leaves a source to the sweep instead of failing it when another model was permitted during the last attempt', async () => {
    const { repository, helper, scheduler, consumer, job } = setup(2);
    scheduler.currentModelId
      .mockResolvedValueOnce(OLD_MODEL_ID)
      .mockResolvedValueOnce(NEW_MODEL_ID);

    await expect(consumer.process(job)).rejects.toBeInstanceOf(
      ProviderServerError,
    );
    expect(repository.failReindex).not.toHaveBeenCalled();
    expect(helper.cleanupIndex).not.toHaveBeenCalled();
    expect(repository.deferReindex).toHaveBeenCalledWith(SOURCE_ID);
  });

  it('re-indexes after finding no model when a model was permitted meanwhile', async () => {
    const { repository, reindexer, consumer, job } = setup(0);
    reindexer.reindex
      .mockResolvedValueOnce('no_model')
      .mockResolvedValueOnce('reindexed');
    repository.isReindexing
      .mockResolvedValueOnce(true)
      .mockResolvedValue(false);

    await consumer.process(job);

    expect(reindexer.reindex).toHaveBeenCalledTimes(2);
  });

  it('re-indexes again when another model was permitted while it ran, since the source cannot be queued twice', async () => {
    const { repository, reindexer, consumer, job } = setup(0);
    reindexer.reindex.mockResolvedValue('reindexed');
    repository.isReindexing
      .mockResolvedValueOnce(true)
      .mockResolvedValue(false);

    await consumer.process(job);

    expect(reindexer.reindex).toHaveBeenCalledTimes(2);
  });
});
