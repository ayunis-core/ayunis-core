import { ActiveThreadRuns } from 'src/domain/runs/application/services/active-thread-runs.service';
import {
  OTHER_USER_ID,
  RUN_OWNER_ID,
  RUN_THREAD_ID,
  runUntilAborted,
  userContextFor,
} from 'src/domain/runs/testing/active-thread-run.fixture';
import { AttachToThreadRunQuery } from './attach-to-thread-run.query';
import { AttachToThreadRunUseCase } from './attach-to-thread-run.use-case';

describe('AttachToThreadRunUseCase', () => {
  let activeThreadRuns: ActiveThreadRuns;

  beforeEach(() => {
    activeThreadRuns = new ActiveThreadRuns();
  });

  const attachAs = (userId: typeof RUN_OWNER_ID) =>
    new AttachToThreadRunUseCase(
      userContextFor(userId),
      activeThreadRuns,
    ).execute(new AttachToThreadRunQuery(RUN_THREAD_ID));

  it('finds nothing on a thread without a run', async () => {
    await expect(attachAs(RUN_OWNER_ID)).resolves.toBeNull();
  });

  it('replays the owner’s run from its start', async () => {
    activeThreadRuns.startDetached(
      { threadId: RUN_THREAD_ID, userId: RUN_OWNER_ID },
      runUntilAborted,
    );
    await new Promise((resolve) => setImmediate(resolve));

    const subscription = await attachAs(RUN_OWNER_ID);
    const listener = new AbortController();
    const events = subscription!(listener.signal)[Symbol.asyncIterator]();

    await expect(events.next()).resolves.toMatchObject({
      value: { type: 'session', streaming: true },
    });
    listener.abort();
    activeThreadRuns.cancel(RUN_THREAD_ID, RUN_OWNER_ID);
  });

  it('does not find another user’s run', async () => {
    activeThreadRuns.startDetached(
      { threadId: RUN_THREAD_ID, userId: RUN_OWNER_ID },
      runUntilAborted,
    );

    await expect(attachAs(OTHER_USER_ID)).resolves.toBeNull();
    activeThreadRuns.cancel(RUN_THREAD_ID, RUN_OWNER_ID);
  });
});
