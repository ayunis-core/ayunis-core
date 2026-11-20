import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  onboardingStageQueryOptions,
  useOnboardingStage,
} from './useOnboardingStage';

const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('@/shared/api/client', () => ({ customAxiosInstance: request }));

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe(useOnboardingStage.name, () => {
  it('shows no stage when it could not be refreshed, so a completed stage is not offered again', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    client.setQueryData(onboardingStageQueryOptions().queryKey, {
      stage: 'profile',
      modelId: 'memory-model',
    });
    request.mockRejectedValue(new Error('offline'));
    await client
      .query({ ...onboardingStageQueryOptions(), staleTime: 0 })
      .catch(() => undefined);

    const { result } = renderHook(() => useOnboardingStage(true), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    });

    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    expect(result.current).toBeUndefined();
  });
});
