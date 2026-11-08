import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  registerActiveThreadRun,
  unregisterActiveThreadRun,
} from '@/features/thread-run/model/active-thread-run';
import type * as ThreadRun from '@/features/thread-run';
import { useRunningThreadIds } from './useRunningThreadIds';

const threadId = '00000000-0000-0000-0000-000000000001';
const listedThreadId = '00000000-0000-0000-0000-000000000002';

vi.mock('@/features/thread-run', async (importOriginal) => ({
  ...(await importOriginal<typeof ThreadRun>()),
  useActiveThreadRuns: () => ({
    runsByThreadId: new Map([
      [listedThreadId, { threadId: listedThreadId, cancellable: false }],
    ]),
    dataUpdatedAt: 1,
  }),
}));

function renderRunningThreadIds() {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useRunningThreadIds(), { wrapper });
}

describe(useRunningThreadIds.name, () => {
  const controller = new AbortController();
  afterEach(() => unregisterActiveThreadRun(threadId, controller));

  it('includes runs the server lists', () => {
    const { result } = renderRunningThreadIds();

    expect(result.current.has(listedThreadId)).toBe(true);
  });

  it('includes a run this tab just started before the server lists it', () => {
    const { result } = renderRunningThreadIds();

    act(() => registerActiveThreadRun(threadId, controller));

    expect(result.current.has(threadId)).toBe(true);
  });
});
