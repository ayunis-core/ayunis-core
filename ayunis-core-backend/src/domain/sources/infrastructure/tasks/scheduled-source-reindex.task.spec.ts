import type { UUID } from 'crypto';
import { createMockSourceRepository } from 'src/domain/sources/application/testing/source.fixtures';
import type {
  DueSourceReindex,
  SourceSubtype,
} from 'src/domain/sources/application/models/due-source-reindex';
import {
  SourceReindexHandler,
  SourceReindexOutcome,
} from 'src/domain/sources/application/services/source-reindex-handler';
import { SourceReindexHandlerRegistry } from 'src/domain/sources/application/services/source-reindex-handler.registry';
import { UnexpectedSourceError } from 'src/domain/sources/application/sources.errors';
import { DataType, TextType } from 'src/domain/sources/domain/source-type.enum';
import { ScheduledSourceReindexTask } from './scheduled-source-reindex.task';

const ORG_ID = '00000000-0000-0000-0000-000000000010' as UUID;

function due(
  sourceId: string,
  subtype: SourceSubtype = TextType.WEB,
): DueSourceReindex {
  return {
    sourceId: sourceId as UUID,
    orgId: ORG_ID,
    subtype,
    dueAt: new Date('2026-09-30T06:00:00.000Z'),
    nextDueAt: new Date('2026-10-14T06:15:00.000Z'),
  };
}

const WASTE_CALENDAR = due('00000000-0000-0000-0000-000000000001');
const OPENING_HOURS = due('00000000-0000-0000-0000-000000000002');

class FakeWebHandler extends SourceReindexHandler {
  readonly subtype = TextType.WEB;
  readonly start = jest.fn<Promise<SourceReindexOutcome>, [DueSourceReindex]>(
    async () => SourceReindexOutcome.STARTED,
  );
}

describe('ScheduledSourceReindexTask', () => {
  let sourceRepository: ReturnType<typeof createMockSourceRepository>;
  let webHandler: FakeWebHandler;
  let task: ScheduledSourceReindexTask;

  beforeEach(() => {
    sourceRepository = createMockSourceRepository();
    webHandler = new FakeWebHandler();
    task = new ScheduledSourceReindexTask(
      sourceRepository,
      new SourceReindexHandlerRegistry([webHandler]),
    );
  });

  it('claims a bounded batch and starts each due source through the handler for its type', async () => {
    sourceRepository.claimDueReindexes.mockResolvedValue([
      WASTE_CALENDAR,
      OPENING_HOURS,
    ]);

    await task.handleSweep();

    expect(sourceRepository.claimDueReindexes).toHaveBeenCalledWith(100);
    expect(webHandler.start.mock.calls).toEqual([
      [WASTE_CALENDAR],
      [OPENING_HOURS],
    ]);
    expect(sourceRepository.releaseReindexClaim).not.toHaveBeenCalled();
  });

  it('leaves a skipped source scheduled for its next interval', async () => {
    sourceRepository.claimDueReindexes.mockResolvedValue([WASTE_CALENDAR]);
    webHandler.start.mockResolvedValue(SourceReindexOutcome.SKIPPED);

    await task.handleSweep();

    expect(sourceRepository.releaseReindexClaim).not.toHaveBeenCalled();
  });

  it('hands the claim back when a run cannot be started, so the next sweep retries it, and carries on', async () => {
    sourceRepository.claimDueReindexes.mockResolvedValue([
      WASTE_CALENDAR,
      OPENING_HOURS,
    ]);
    webHandler.start.mockRejectedValueOnce(
      new UnexpectedSourceError(new Error('Redis connection refused')),
    );

    await task.handleSweep();

    expect(sourceRepository.releaseReindexClaim).toHaveBeenCalledTimes(1);
    expect(sourceRepository.releaseReindexClaim).toHaveBeenCalledWith(
      WASTE_CALENDAR,
    );
    expect(webHandler.start).toHaveBeenCalledWith(OPENING_HOURS);
  });

  it('carries on when handing a claim back fails too', async () => {
    sourceRepository.claimDueReindexes.mockResolvedValue([
      WASTE_CALENDAR,
      OPENING_HOURS,
    ]);
    webHandler.start.mockRejectedValueOnce(new Error('Redis down'));
    sourceRepository.releaseReindexClaim.mockRejectedValueOnce(
      new Error('connection terminated'),
    );

    await expect(task.handleSweep()).resolves.toBeUndefined();

    expect(webHandler.start).toHaveBeenCalledWith(OPENING_HOURS);
  });

  it('skips a source type without a handler', async () => {
    const spreadsheet = due(
      '00000000-0000-0000-0000-000000000003',
      DataType.CSV,
    );
    sourceRepository.claimDueReindexes.mockResolvedValue([
      spreadsheet,
      WASTE_CALENDAR,
    ]);

    await task.handleSweep();

    expect(webHandler.start.mock.calls).toEqual([[WASTE_CALENDAR]]);
    expect(sourceRepository.releaseReindexClaim).not.toHaveBeenCalled();
  });

  it('does not throw when claiming fails', async () => {
    sourceRepository.claimDueReindexes.mockRejectedValue(
      new Error('connection terminated'),
    );

    await expect(task.handleSweep()).resolves.toBeUndefined();
  });

  it('skips a sweep while the previous one in this process is still running', async () => {
    let finishFirst: () => void = () => {};
    sourceRepository.claimDueReindexes.mockResolvedValue([WASTE_CALENDAR]);
    webHandler.start.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishFirst = () => resolve(SourceReindexOutcome.STARTED);
        }),
    );

    const first = task.handleSweep();
    await new Promise(setImmediate);
    await task.handleSweep();
    finishFirst();
    await first;

    expect(sourceRepository.claimDueReindexes).toHaveBeenCalledTimes(1);
  });
});
