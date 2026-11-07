import type { UUID } from 'crypto';
import type { RunEvent } from 'src/domain/runs/application/run-events';
import { ActiveThreadRuns } from 'src/domain/runs/application/services/active-thread-runs.service';
import {
  OTHER_USER_ID,
  RUN_OWNER_ID,
  RUN_THREAD_ID,
  userContextFor,
} from 'src/domain/runs/testing/active-thread-run.fixture';
import { CancelThreadRunCommand } from './cancel-thread-run.command';
import { CancelThreadRunUseCase } from './cancel-thread-run.use-case';

describe('CancelThreadRunUseCase', () => {
  let activeThreadRuns: ActiveThreadRuns;
  let runSignal: AbortSignal | undefined;

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
  });

  afterEach(() => activeThreadRuns.cancel(RUN_THREAD_ID, RUN_OWNER_ID));

  const cancelAs = (userId: UUID) =>
    new CancelThreadRunUseCase(
      userContextFor(userId),
      activeThreadRuns,
    ).execute(new CancelThreadRunCommand(RUN_THREAD_ID));

  it('stops the owner’s run', async () => {
    await cancelAs(RUN_OWNER_ID);

    expect(runSignal?.aborted).toBe(true);
  });

  it('leaves the run alone when another user cancels it', async () => {
    await cancelAs(OTHER_USER_ID);

    expect(runSignal?.aborted).toBe(false);
  });

  it('succeeds when the thread has no run', async () => {
    await cancelAs(RUN_OWNER_ID);
    await new Promise((resolve) => setImmediate(resolve));

    await expect(cancelAs(RUN_OWNER_ID)).resolves.toBeUndefined();
  });
});
