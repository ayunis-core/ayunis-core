import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import type { RunEvent } from 'src/domain/runs/application/run-events';
import {
  ActiveThreadRun,
  type ActiveThreadRunOwner,
} from './active-thread-run';

export const UNWATCHED_RUN_TIMEOUT_MS = 15 * 60_000;

export interface ActiveThreadRunSummary {
  threadId: UUID;
  cancellable: boolean;
}

/**
 * The runs in progress in this process, by thread. Runs outlive the request
 * that started them, so a user can leave a chat and attach to its run again
 * later. Every lookup is scoped to the run's owner.
 *
 * Process-local, like ThreadRunLock: a run is lost with its process, so a
 * restart never leaves a thread marked as running.
 */
@Injectable()
export class ActiveThreadRuns {
  private readonly logger = new Logger(ActiveThreadRuns.name);
  private readonly runsByThread = new Map<UUID, Set<ActiveThreadRun>>();

  open(
    owner: ActiveThreadRunOwner & { abortController?: AbortController },
  ): ActiveThreadRun {
    const run: ActiveThreadRun = new ActiveThreadRun(
      { threadId: owner.threadId, userId: owner.userId },
      owner.abortController,
      UNWATCHED_RUN_TIMEOUT_MS,
      () => this.remove(run),
    );
    const runs = this.runsByThread.get(owner.threadId) ?? new Set();
    runs.add(run);
    this.runsByThread.set(owner.threadId, runs);
    return run;
  }

  /**
   * Drains `source` in the background until it ends; only `cancel` and the
   * unwatched timeout abort the signal passed to it.
   */
  startDetached(
    owner: ActiveThreadRunOwner,
    source: (signal: AbortSignal) => AsyncIterable<RunEvent>,
  ): ActiveThreadRun {
    const abortController = new AbortController();
    const run = this.open({ ...owner, abortController });
    void this.drain(run, () => source(abortController.signal));
    return run;
  }

  /** The newest run on the thread, if `userId` owns it. */
  find(threadId: UUID, userId: UUID): ActiveThreadRun | undefined {
    return [...(this.runsByThread.get(threadId) ?? [])]
      .filter((run) => run.owner.userId === userId)
      .at(-1);
  }

  cancel(threadId: UUID, userId: UUID): void {
    this.runsByThread.get(threadId)?.forEach((run) => {
      if (run.owner.userId === userId) run.cancel();
    });
  }

  listForUser(userId: UUID): ActiveThreadRunSummary[] {
    const summaries: ActiveThreadRunSummary[] = [];
    for (const [threadId, runs] of this.runsByThread) {
      const owned = [...runs].filter((run) => run.owner.userId === userId);
      if (owned.length === 0) continue;
      summaries.push({
        threadId,
        cancellable: owned.some((run) => run.cancellable),
      });
    }
    return summaries;
  }

  private async drain(
    run: ActiveThreadRun,
    source: () => AsyncIterable<RunEvent>,
  ): Promise<void> {
    try {
      for await (const event of source()) {
        run.publish(event);
      }
    } catch (error) {
      this.logger.error(
        {
          threadId: run.owner.threadId,
          err: error instanceof Error ? error : new Error(String(error)),
        },
        'Detached run failed',
      );
    } finally {
      run.close();
    }
  }

  private remove(run: ActiveThreadRun): void {
    const runs = this.runsByThread.get(run.owner.threadId);
    runs?.delete(run);
    if (runs?.size === 0) this.runsByThread.delete(run.owner.threadId);
  }
}
