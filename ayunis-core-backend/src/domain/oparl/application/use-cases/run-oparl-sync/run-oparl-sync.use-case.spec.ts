import type { UUID } from 'crypto';
import { OparlEntityType } from 'src/domain/oparl/domain/oparl-entity-type.enum';
import { OparlSystem } from 'src/domain/oparl/domain/oparl-system.entity';
import {
  OparlSyncKind,
  OparlSyncRun,
  OparlSyncRunStatus,
} from 'src/domain/oparl/domain/oparl-sync-run.entity';
import type { OparlMirrorRepository } from 'src/domain/oparl/application/ports/oparl-mirror.repository';
import type { OparlSyncRunsRepository } from 'src/domain/oparl/application/ports/oparl-sync-runs.repository';
import type { OparlSystemsRepository } from 'src/domain/oparl/application/ports/oparl-systems.repository';
import { OparlSyncInterruptedError } from 'src/domain/oparl/application/oparl.errors';
import type {
  OparlSyncContext,
  OparlSyncOutcome,
  OparlSyncService,
} from 'src/domain/oparl/application/services/oparl-sync.service';
import { RunOparlSyncCommand } from './run-oparl-sync.command';
import { RunOparlSyncUseCase } from './run-oparl-sync.use-case';

const DAY = 24 * 60 * 60 * 1000;

function aSystem(state: {
  lastFullSyncAt: Date | null;
  lastDeltaSyncAt?: Date | null;
}) {
  return new OparlSystem({
    url: 'https://rim.ekom21.de/aarbergen/webservice/oparl/v1.1/system',
    oparlId: 'https://rim.ekom21.de/aarbergen/webservice/oparl/v1.1/system',
    name: 'SD.NET RIM',
    vendor: null,
    product: null,
    oparlVersion: null,
    website: null,
    raw: {},
    ...state,
  });
}

function setup(
  system: OparlSystem,
  sync: (context: OparlSyncContext) => Promise<OparlSyncOutcome>,
  unlisted = [{ type: OparlEntityType.PAPER, total: 970, removed: 3 }],
) {
  const runs = new Map<UUID, OparlSyncRun>();
  const systems = {
    findById: jest.fn().mockResolvedValue(system),
    updateSyncState: jest.fn().mockResolvedValue(undefined),
  };
  const runsRepository = {
    create: jest.fn((run: OparlSyncRun) => {
      runs.set(run.id, run);
      return Promise.resolve();
    }),
    findById: jest.fn((id: UUID) => Promise.resolve(runs.get(id) ?? null)),
    update: jest.fn().mockResolvedValue(undefined),
    failRunning: jest.fn().mockResolvedValue([]),
  };
  const mirror = {
    countUnlisted: jest.fn().mockResolvedValue(unlisted),
    deleteUnlisted: jest.fn().mockResolvedValue({ [OparlEntityType.PAPER]: 3 }),
    forgetListed: jest.fn().mockResolvedValue(undefined),
  };
  const syncService = { sync: jest.fn(sync) };
  const useCase = new RunOparlSyncUseCase(
    systems as unknown as OparlSystemsRepository,
    runsRepository as unknown as OparlSyncRunsRepository,
    mirror as unknown as OparlMirrorRepository,
    syncService as unknown as OparlSyncService,
  );
  const finished = () =>
    runsRepository.update.mock.calls.at(-1)?.[0] as OparlSyncRun | undefined;
  return { useCase, runs, runsRepository, mirror, syncService, finished };
}

const command = (
  systemId: UUID,
  progress: RunOparlSyncCommand['progress'] = null,
) =>
  new RunOparlSyncCommand(
    systemId,
    progress,
    () => Promise.resolve(),
    new AbortController().signal,
  );

const complete = () =>
  Promise.resolve({
    listingError: null,
    invalidObjects: 0,
  });
const failing = () =>
  Promise.resolve({
    listingError: 'The OParl endpoint could not be reached',
    invalidObjects: 0,
  });

describe('RunOparlSyncUseCase', () => {
  const weekAgo = new Date(Date.now() - 8 * DAY);

  it('removes what a complete weekly listing no longer contains', async () => {
    const system = aSystem({ lastFullSyncAt: weekAgo });
    const { useCase, mirror, finished } = setup(system, complete);

    await useCase.execute(command(system.id));

    expect(finished()).toMatchObject({
      kind: OparlSyncKind.FULL,
      status: OparlSyncRunStatus.SUCCEEDED,
      stats: { deleted: { [OparlEntityType.PAPER]: 3 } },
    });
    expect(mirror.deleteUnlisted).toHaveBeenCalled();
    expect(system.lastFullSyncAt).toEqual(finished()!.startedAt);
  });

  it('removes nothing and is suspicious when the weekly listing failed', async () => {
    const system = aSystem({ lastFullSyncAt: weekAgo });
    const { useCase, mirror, finished } = setup(system, failing);

    await useCase.execute(command(system.id));

    expect(finished()).toMatchObject({
      status: OparlSyncRunStatus.SUSPICIOUS,
      error: 'The OParl endpoint could not be reached',
    });
    expect(mirror.deleteUnlisted).not.toHaveBeenCalled();
    expect(system.lastFullSyncAt).toEqual(weekAgo);
  });

  it('removes nothing and is suspicious when a type would lose more than a tenth', async () => {
    const system = aSystem({ lastFullSyncAt: weekAgo });
    const { useCase, mirror, finished } = setup(system, complete, [
      { type: OparlEntityType.MEETING, total: 667, removed: 300 },
    ]);

    await useCase.execute(command(system.id));

    expect(finished()?.status).toBe(OparlSyncRunStatus.SUSPICIOUS);
    expect(finished()?.error).toContain('meeting 300 of 667');
    expect(mirror.deleteUnlisted).not.toHaveBeenCalled();
  });

  it('fails a delta whose listing failed, so the next one asks for the same changes', async () => {
    const lastDelta = new Date(Date.now() - DAY);
    const system = aSystem({
      lastFullSyncAt: new Date(Date.now() - 2 * DAY),
      lastDeltaSyncAt: lastDelta,
    });
    const { useCase, finished } = setup(system, failing);

    await useCase.execute(command(system.id));

    expect(finished()).toMatchObject({
      kind: OparlSyncKind.DELTA,
      status: OparlSyncRunStatus.FAILED,
    });
    expect(system.lastDeltaSyncAt).toEqual(lastDelta);
    expect(system.consecutiveFailures).toBe(1);
    expect(system.lastError).toBe('The OParl endpoint could not be reached');
  });

  it('records an unexpected failure on the run instead of leaving it running', async () => {
    const system = aSystem({ lastFullSyncAt: null });
    const { useCase, finished } = setup(system, () =>
      Promise.reject(new Error('connection terminated')),
    );

    await useCase.execute(command(system.id));

    expect(finished()).toMatchObject({
      kind: OparlSyncKind.INITIAL,
      status: OparlSyncRunStatus.FAILED,
      error: 'connection terminated',
    });
  });

  it('leaves the run running on shutdown, to be resumed', async () => {
    const system = aSystem({ lastFullSyncAt: null });
    const { useCase, runsRepository } = setup(system, () =>
      Promise.reject(new OparlSyncInterruptedError()),
    );

    await expect(useCase.execute(command(system.id))).rejects.toBeInstanceOf(
      OparlSyncInterruptedError,
    );
    expect(runsRepository.update).not.toHaveBeenCalled();
  });

  it('resumes the run its progress names where the listing stood, with its stats so far', async () => {
    const system = aSystem({ lastFullSyncAt: null });
    const { useCase, runs, runsRepository, syncService, finished } = setup(
      system,
      complete,
    );
    const interrupted = new OparlSyncRun({
      systemId: system.id,
      kind: OparlSyncKind.INITIAL,
      modifiedSince: null,
    });
    runs.set(interrupted.id, interrupted);
    const progress = {
      runId: interrupted.id,
      cursors: {
        [`${system.oparlId} paper`]: 'https://rim.ekom21.de/paper?page=12',
      },
      stats: {
        pages: 62,
        written: { [OparlEntityType.MEETING]: 525 },
        deleted: {},
      },
    };

    await useCase.execute(command(system.id, progress));

    expect(runsRepository.create).not.toHaveBeenCalled();
    expect(syncService.sync.mock.calls[0][0]).toMatchObject({
      run: { id: interrupted.id },
      progress,
    });
    expect(finished()?.stats).toMatchObject({
      pages: 62,
      written: { [OparlEntityType.MEETING]: 525 },
    });
  });

  it('forgets what a run abandoned by a lost worker had listed', async () => {
    const system = aSystem({ lastFullSyncAt: weekAgo });
    const { useCase, runsRepository, mirror } = setup(system, complete);
    const abandoned = '6f1c1f0e-3a9e-4d6b-9a55-8b7c2f0d1e2a' as UUID;
    runsRepository.failRunning.mockResolvedValueOnce([abandoned]);

    await useCase.execute(command(system.id));

    expect(mirror.forgetListed).toHaveBeenCalledWith([abandoned]);
  });

  it('removes nothing after a full listing that skipped objects without ID', async () => {
    const system = aSystem({ lastFullSyncAt: weekAgo });
    const { useCase, mirror, finished } = setup(system, () =>
      Promise.resolve({
        listingError: null,
        invalidObjects: 2,
      }),
    );

    await useCase.execute(command(system.id));

    expect(finished()).toMatchObject({
      status: OparlSyncRunStatus.SUSPICIOUS,
      error: 'Listing incomplete: 2 objects without ID',
    });
    expect(mirror.deleteUnlisted).not.toHaveBeenCalled();
  });
});
