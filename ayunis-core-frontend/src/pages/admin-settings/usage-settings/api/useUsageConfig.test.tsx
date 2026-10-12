import type { ReactNode } from 'react';
import {
  QueryClient,
  QueryClientProvider,
  focusManager,
} from '@tanstack/react-query';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useUsageConfig } from './useUsageConfig';

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
  request.mockImplementation(async () => ({
    isSelfHosted: false,
    hideIndividualUsage: hidden,
  }));
});
afterEach(() => {
  cleanup();
  client.clear();
  focusManager.setFocused();
  vi.useRealTimers();
});
it('observes enabling and disabling privacy in another session without remounting', async () => {
  const { result } = renderHook(() => useUsageConfig(), { wrapper });
  await act(() => vi.advanceTimersByTimeAsync(1));
  expect(result.current.data?.hideIndividualUsage).toBe(false);
  hidden = true;
  await act(() => vi.advanceTimersByTimeAsync(5000));
  expect(result.current.data?.hideIndividualUsage).toBe(true);
  hidden = false;
  await act(() => vi.advanceTimersByTimeAsync(5000));
  expect(result.current.data?.hideIndividualUsage).toBe(false);
  expect(result.current.isFetchedAfterMount).toBe(true);
});
it('pauses background polling and refreshes when the tab becomes visible', async () => {
  const { result } = renderHook(() => useUsageConfig(), { wrapper });
  await act(() => vi.advanceTimersByTimeAsync(1));
  act(() => focusManager.setFocused(false));
  hidden = true;
  await act(() => vi.advanceTimersByTimeAsync(5000));
  expect(result.current.data?.hideIndividualUsage).toBe(false);
  act(() => focusManager.setFocused(true));
  await act(() => vi.advanceTimersByTimeAsync(1));
  expect(result.current.data?.hideIndividualUsage).toBe(true);
});
