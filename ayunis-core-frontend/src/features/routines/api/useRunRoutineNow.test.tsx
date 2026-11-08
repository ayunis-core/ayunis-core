import type { ReactNode } from 'react';
import {
  QueryClient,
  QueryClientProvider,
  focusManager,
} from '@tanstack/react-query';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useActiveThreadRuns } from '@/features/thread-run';
import { useRunRoutineNow } from './useRunRoutineNow';

const { request } = vi.hoisted(() => ({ request: vi.fn() }));

vi.mock('@/shared/api/client', () => ({ customAxiosInstance: request }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/shared/lib/toast', () => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));

const ROUTINE_THREAD_ID = 'routine-thread-id';

let client: QueryClient;
let activeRuns: { threadId: string; cancellable: boolean }[];
let activeRunsRequests: number;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function renderSidebarAndRunNow() {
  return renderHook(
    () => ({ runs: useActiveThreadRuns(), runNow: useRunRoutineNow() }),
    { wrapper },
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  focusManager.setFocused(true);
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  activeRuns = [];
  activeRunsRequests = 0;
  request.mockImplementation(async ({ url }: { url: string }) => {
    if (url === '/runs/active') {
      activeRunsRequests++;
      return activeRuns;
    }
    return undefined;
  });
});

afterEach(() => {
  cleanup();
  client.clear();
  focusManager.setFocused();
  vi.useRealTimers();
});

describe('useRunRoutineNow', () => {
  it('lists a short routine run that starts after the request has returned', async () => {
    const { result } = renderSidebarAndRunNow();
    await act(() => vi.advanceTimersByTimeAsync(1));

    act(() => result.current.runNow.mutate('routine-id'));
    await act(() => vi.advanceTimersByTimeAsync(500));
    // The worker picks up the queued job after the request has returned.
    activeRuns = [{ threadId: ROUTINE_THREAD_ID, cancellable: true }];
    await act(() => vi.advanceTimersByTimeAsync(1_500));

    expect(result.current.runs.runsByThreadId.has(ROUTINE_THREAD_ID)).toBe(
      true,
    );
  });

  it('returns to idle polling when the started routine never lists a run', async () => {
    const { result } = renderSidebarAndRunNow();
    await act(() => vi.advanceTimersByTimeAsync(1));

    act(() => result.current.runNow.mutate('routine-id'));
    await act(() => vi.advanceTimersByTimeAsync(60_000));
    const requestsBefore = activeRunsRequests;
    await act(() => vi.advanceTimersByTimeAsync(29_000));

    expect(activeRunsRequests - requestsBefore).toBeLessThanOrEqual(1);
  });
});
