import type { EnqueueSourceReindexUseCase } from 'src/domain/sources/application/use-cases/enqueue-source-reindex/enqueue-source-reindex.use-case';
import type { EnqueueSourceReindexCommand } from 'src/domain/sources/application/use-cases/enqueue-source-reindex/enqueue-source-reindex.command';
import {
  SourceNotFoundError,
  SourceNotReadyForReindexError,
  UnexpectedSourceError,
} from 'src/domain/sources/application/sources.errors';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { TextType } from 'src/domain/sources/domain/source-type.enum';
import type { DueSourceReindex } from 'src/domain/sources/application/models/due-source-reindex';
import { SourceReindexOutcome } from './source-reindex-handler';
import { UrlSourceReindexHandler } from './url-source-reindex-handler.service';

const DUE: DueSourceReindex = {
  sourceId: '00000000-0000-0000-0000-000000000001',
  orgId: '00000000-0000-0000-0000-000000000010',
  subtype: TextType.WEB,
  dueAt: new Date('2026-09-30T06:00:00.000Z'),
  nextDueAt: new Date('2026-10-14T06:15:00.000Z'),
};

describe('UrlSourceReindexHandler', () => {
  let enqueue: jest.Mock<Promise<void>, [EnqueueSourceReindexCommand]>;
  let handler: UrlSourceReindexHandler;

  beforeEach(() => {
    enqueue = jest.fn().mockResolvedValue(undefined);
    handler = new UrlSourceReindexHandler({
      execute: enqueue,
    } as unknown as EnqueueSourceReindexUseCase);
  });

  it('handles web sources', () => {
    expect(handler.subtype).toBe(TextType.WEB);
  });

  it('enqueues a system-initiated re-index in the org of the source’s knowledge base', async () => {
    await expect(handler.start(DUE)).resolves.toBe(
      SourceReindexOutcome.STARTED,
    );

    const [command] = enqueue.mock.calls[0];
    expect(command).toMatchObject({
      sourceId: DUE.sourceId,
      orgId: DUE.orgId,
    });
    expect(command.userId).toBeUndefined();
  });

  it.each([
    [
      'no longer ready',
      new SourceNotReadyForReindexError(DUE.sourceId, SourceStatus.FAILED),
    ],
    ['gone', new SourceNotFoundError(DUE.sourceId)],
  ])('skips a source that is %s', async (_case, error) => {
    enqueue.mockRejectedValue(error);

    await expect(handler.start(DUE)).resolves.toBe(
      SourceReindexOutcome.SKIPPED,
    );
  });

  it('rethrows a failure to enqueue so the run can be retried', async () => {
    const failure = new UnexpectedSourceError(
      new Error('Redis connection refused'),
    );
    enqueue.mockRejectedValue(failure);

    await expect(handler.start(DUE)).rejects.toBe(failure);
  });
});
