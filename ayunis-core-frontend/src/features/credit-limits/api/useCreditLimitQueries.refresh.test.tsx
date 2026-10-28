import type { ReactNode } from 'react';
import {
  QueryClient,
  QueryClientProvider,
  focusManager,
} from '@tanstack/react-query';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import {
  useUserLimitOverview,
  useTeamLimitOverview,
} from './useCreditLimitQueries';
const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('@/shared/api/client', () => ({ customAxiosInstance: request }));
let client: QueryClient;
let hidden = false;
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
beforeEach(() => {
  vi.useFakeTimers();
  focusManager.setFocused(true);
  hidden = false;
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  request.mockImplementation(async () => [
    {
      userId: 'anna',
      teamId: 'finance',
      name: 'Finance',
      email: 'anna@usage.local',
      monthlyCredits: 5000,
      ...(hidden ? {} : { creditsUsed: 1240 }),
    },
  ]);
});
afterEach(() => {
  cleanup();
  client.clear();
  focusManager.setFocused();
  vi.useRealTimers();
});
it.each([
  ['users', useUserLimitOverview],
  ['teams', useTeamLimitOverview],
] as const)(
  'updates %s consumption after cross-session privacy changes without remounting',
  async (_target, useOverview) => {
    const { result } = renderHook(() => useOverview(true), { wrapper });
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect([...result.current.limits.values()][0].creditsUsed).toBe(1240);
    hidden = true;
    await act(() => vi.advanceTimersByTimeAsync(5000));
    expect([...result.current.limits.values()][0].creditsUsed).toBeUndefined();
    expect(result.current.isPending).toBe(false);
    hidden = false;
    await act(() => vi.advanceTimersByTimeAsync(5000));
    expect([...result.current.limits.values()][0].creditsUsed).toBe(1240);
  },
);
