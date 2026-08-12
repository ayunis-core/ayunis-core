import { afterEach, describe, expect, it } from 'vitest';
import {
  abortActiveThreadRun,
  registerActiveThreadRun,
  unregisterActiveThreadRun,
} from './active-thread-run';

const threadId = '00000000-0000-0000-0000-000000000001';

describe('active thread run', () => {
  afterEach(() => abortActiveThreadRun(threadId));

  it('aborts the registered run for a thread', () => {
    const controller = new AbortController();
    registerActiveThreadRun(threadId, controller);

    abortActiveThreadRun(threadId);

    expect(controller.signal.aborted).toBe(true);
  });

  it('does not unregister a newer run when an older run finishes', () => {
    const olderController = new AbortController();
    const newerController = new AbortController();
    registerActiveThreadRun(threadId, olderController);
    registerActiveThreadRun(threadId, newerController);

    unregisterActiveThreadRun(threadId, olderController);
    abortActiveThreadRun(threadId);

    expect(newerController.signal.aborted).toBe(true);
  });
});
