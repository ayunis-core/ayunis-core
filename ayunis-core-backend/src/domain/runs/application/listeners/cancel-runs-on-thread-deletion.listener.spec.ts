import type { RunEvent } from 'src/domain/runs/application/run-events';
import { ThreadDeletionRequestedEvent } from 'src/domain/threads/application/events/thread-deletion-requested.event';
import { ActiveThreadRuns } from 'src/domain/runs/application/services/active-thread-runs.service';
import {
  RUN_OWNER_ID,
  RUN_THREAD_ID,
} from 'src/domain/runs/testing/active-thread-run.fixture';
import { CancelRunsOnThreadDeletionListener } from './cancel-runs-on-thread-deletion.listener';

const ORG_ID = 'f0e1d2c3-b4a5-4968-8776-655443322110' as const;

describe('CancelRunsOnThreadDeletionListener', () => {
  let activeThreadRuns: ActiveThreadRuns;
  let runSignal: AbortSignal | undefined;
  let event: ThreadDeletionRequestedEvent;

  beforeEach(() => {
    activeThreadRuns = new ActiveThreadRuns();
    activeThreadRuns.startDetached(
      { threadId: RUN_THREAD_ID, userId: RUN_OWNER_ID },
      // eslint-disable-next-line require-yield, sonarjs/generator-without-yield
      async function* (signal): AsyncGenerator<RunEvent> {
        runSignal = signal;
        await new Promise<void>((resolve) =>
          signal.addEventListener('abort', () => resolve(), { once: true }),
        );
      },
    );
    event = new ThreadDeletionRequestedEvent(
      RUN_THREAD_ID,
      RUN_OWNER_ID,
      ORG_ID,
    );
    new CancelRunsOnThreadDeletionListener(activeThreadRuns).handle(event);
  });

  afterEach(() => activeThreadRuns.cancel(RUN_THREAD_ID, RUN_OWNER_ID));

  it('leaves the run alone until the thread is actually deleted', () => {
    expect(runSignal?.aborted).toBe(false);
  });

  it('stops the owner’s run once the deletion succeeded', async () => {
    for (const task of event.takeCleanupTasks()) await task.run();

    expect(runSignal?.aborted).toBe(true);
  });
});
