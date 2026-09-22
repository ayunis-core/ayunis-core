import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  abortActiveThreadRun,
  registerActiveThreadRun,
  unregisterActiveThreadRun,
} from './active-thread-run';
import { useIsThreadRunActive } from './useIsThreadRunActive';

const threadA = '00000000-0000-0000-0000-000000000001';
const threadB = '00000000-0000-0000-0000-000000000002';

describe(useIsThreadRunActive.name, () => {
  afterEach(() => {
    abortActiveThreadRun(threadA);
    abortActiveThreadRun(threadB);
  });

  it('reacts when a run starts and finishes for the mounted thread', () => {
    const controller = new AbortController();
    const { result } = renderHook(() => useIsThreadRunActive(threadA));

    expect(result.current).toBe(false);

    act(() => registerActiveThreadRun(threadA, controller));
    expect(result.current).toBe(true);

    act(() => unregisterActiveThreadRun(threadA, controller));
    expect(result.current).toBe(false);
  });

  it('reports a run that was already active before the thread mounted', () => {
    const controller = new AbortController();
    registerActiveThreadRun(threadA, controller);

    const { result, rerender } = renderHook(
      ({ threadId }) => useIsThreadRunActive(threadId),
      { initialProps: { threadId: threadA } },
    );

    expect(result.current).toBe(true);

    rerender({ threadId: threadB });
    expect(result.current).toBe(false);

    act(() => unregisterActiveThreadRun(threadA, controller));
    rerender({ threadId: threadA });
    expect(result.current).toBe(false);
  });
});
