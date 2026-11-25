import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { reconciliationVerdict } from 'src/domain/oparl/domain/oparl-reconciliation';
import type { OparlSystem } from 'src/domain/oparl/domain/oparl-system.entity';
import {
  OparlSyncKind,
  OparlSyncRunStatus,
  type OparlSyncRun,
} from 'src/domain/oparl/domain/oparl-sync-run.entity';
import type { OparlSyncProgress } from 'src/domain/oparl/application/models/oparl-sync-progress';
import { OparlMirrorRepository } from 'src/domain/oparl/application/ports/oparl-mirror.repository';
import { OparlSyncRunsRepository } from 'src/domain/oparl/application/ports/oparl-sync-runs.repository';
import { OparlSystemsRepository } from 'src/domain/oparl/application/ports/oparl-systems.repository';
import {
  OparlSyncInterruptedError,
  UnexpectedOparlError,
} from 'src/domain/oparl/application/oparl.errors';
import {
  OparlSyncService,
  type OparlSyncOutcome,
} from 'src/domain/oparl/application/services/oparl-sync.service';
import { RunOparlSyncCommand } from './run-oparl-sync.command';

/**
 * One sync run of a system, without a user: an initial import, a delta or
 * a full reconciliation as the system's schedule has it. Resumes a run its
 * progress names, if that run is still running. A failure is recorded on
 * the run and the system (shown in the catalog) and schedules the next
 * attempt; it is not thrown. A shutdown leaves the run running, to be
 * resumed (`OparlSyncInterruptedError`).
 */
@Injectable()
export class RunOparlSyncUseCase {
  private readonly logger = new Logger(RunOparlSyncUseCase.name);

  constructor(
    private readonly systems: OparlSystemsRepository,
    private readonly runs: OparlSyncRunsRepository,
    private readonly mirror: OparlMirrorRepository,
    private readonly syncService: OparlSyncService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedOparlError)
  async execute(command: RunOparlSyncCommand): Promise<void> {
    const system = await this.systems.findById(command.systemId);
    if (!system) return;
    const { run, progress } = await this.startOrResume(system, command);
    this.logger.log(
      { systemId: system.id, runId: run.id, kind: run.kind },
      'Syncing OParl system',
    );
    try {
      const outcome = await this.syncService.sync({
        system,
        run,
        progress,
        saveProgress: command.saveProgress,
        signal: command.signal,
      });
      await this.finish(system, run, outcome);
    } catch (error) {
      if (error instanceof OparlSyncInterruptedError) throw error;
      this.logger.error(
        { systemId: system.id, runId: run.id, err: error as Error },
        'OParl sync failed',
      );
      run.finish(
        OparlSyncRunStatus.FAILED,
        (error as Error).message,
        new Date(),
      );
      await this.close(system, run);
    }
  }

  private async startOrResume(
    system: OparlSystem,
    command: RunOparlSyncCommand,
  ): Promise<{ run: OparlSyncRun; progress: OparlSyncProgress }> {
    const resumed = command.progress
      ? await this.runs.findById(command.progress.runId)
      : null;
    if (
      command.progress &&
      resumed?.systemId === system.id &&
      resumed.status === OparlSyncRunStatus.RUNNING
    ) {
      resumed.stats = command.progress.stats ?? resumed.stats;
      return { run: resumed, progress: command.progress };
    }
    const run = system.planRun(new Date());
    await this.runs.create(run);
    const abandoned = await this.runs.failRunning(
      system.id,
      run.id,
      'Interrupted before it finished',
      new Date(),
    );
    await this.mirror.forgetListed(abandoned);
    const progress: OparlSyncProgress = { runId: run.id, cursors: {} };
    await command.saveProgress(progress);
    return { run, progress };
  }

  private async finish(
    system: OparlSystem,
    run: OparlSyncRun,
    outcome: OparlSyncOutcome,
  ): Promise<void> {
    const status = await this.statusAfter(run, outcome);
    run.finish(
      status,
      outcome.listingError ?? run.stats.reconciliation ?? null,
      new Date(),
    );
    await this.close(system, run);
  }

  /** A delta or initial import whose listing stopped failed; a full listing reconciles. */
  private async statusAfter(
    run: OparlSyncRun,
    outcome: OparlSyncOutcome,
  ): Promise<OparlSyncRunStatus> {
    if (outcome.listingError && run.kind !== OparlSyncKind.FULL)
      return OparlSyncRunStatus.FAILED;
    if (!run.reconciles) return OparlSyncRunStatus.SUCCEEDED;
    const incomplete =
      outcome.listingError ??
      (outcome.invalidObjects > 0
        ? `${outcome.invalidObjects} objects without ID`
        : null);
    return this.reconcile(run, incomplete);
  }

  /**
   * Removes what a complete listing no longer contains, unless the listing
   * is incomplete or would remove more than a tenth of a type: the run is
   * then suspicious and removes nothing.
   */
  private async reconcile(
    run: OparlSyncRun,
    incomplete: string | null,
  ): Promise<OparlSyncRunStatus> {
    const counts = incomplete
      ? []
      : await this.mirror.countUnlisted(run.systemId, run.id);
    const verdict = reconciliationVerdict(incomplete, counts);
    if (!verdict.deletes) {
      run.stats.reconciliation = verdict.reason;
      return OparlSyncRunStatus.SUSPICIOUS;
    }
    const deleted = await this.mirror.deleteUnlisted(run.systemId, run.id);
    for (const [type, n] of Object.entries(deleted))
      run.stats.deleted[type as keyof typeof deleted] =
        (run.stats.deleted[type as keyof typeof deleted] ?? 0) + n;
    return OparlSyncRunStatus.SUCCEEDED;
  }

  private async close(system: OparlSystem, run: OparlSyncRun): Promise<void> {
    if (run.reconciles) await this.mirror.forgetListed([run.id]);
    await this.runs.update(run);
    system.recordFinishedRun(run, new Date());
    await this.systems.updateSyncState(system);
  }
}
