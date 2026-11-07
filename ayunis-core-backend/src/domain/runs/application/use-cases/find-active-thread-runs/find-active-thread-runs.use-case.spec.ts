import { ActiveThreadRuns } from 'src/domain/runs/application/services/active-thread-runs.service';
import {
  OTHER_USER_ID,
  RUN_OWNER_ID,
  RUN_THREAD_ID,
  runUntilAborted,
  userContextFor,
} from 'src/domain/runs/testing/active-thread-run.fixture';
import { FindActiveThreadRunsUseCase } from './find-active-thread-runs.use-case';

describe('FindActiveThreadRunsUseCase', () => {
  let activeThreadRuns: ActiveThreadRuns;

  beforeEach(() => {
    activeThreadRuns = new ActiveThreadRuns();
    activeThreadRuns.startDetached(
      { threadId: RUN_THREAD_ID, userId: RUN_OWNER_ID },
      runUntilAborted,
    );
  });

  afterEach(() => activeThreadRuns.cancel(RUN_THREAD_ID, RUN_OWNER_ID));

  it('lists the current user’s runs', async () => {
    const useCase = new FindActiveThreadRunsUseCase(
      userContextFor(RUN_OWNER_ID),
      activeThreadRuns,
    );

    await expect(useCase.execute()).resolves.toEqual([
      { threadId: RUN_THREAD_ID, cancellable: true },
    ]);
  });

  it('lists none of another user’s runs', async () => {
    const useCase = new FindActiveThreadRunsUseCase(
      userContextFor(OTHER_USER_ID),
      activeThreadRuns,
    );

    await expect(useCase.execute()).resolves.toEqual([]);
  });
});
