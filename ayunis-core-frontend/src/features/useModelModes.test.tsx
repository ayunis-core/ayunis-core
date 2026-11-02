import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { getModelModesControllerGetModelModesQueryKey } from '@/shared/api';
import { useModelModes } from './useModelModes';

const fetchModes = vi.hoisted(() => vi.fn());
vi.mock('@/shared/api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  modelModesControllerGetModelModes: fetchModes,
}));

describe('useModelModes', () => {
  it('refetches resolutions on mount even when a fresh copy is cached', async () => {
    const fresh = [
      { mode: 'auto', permittedModelId: 'b', anonymousPermittedModelId: 'b' },
    ];
    fetchModes.mockResolvedValue(fresh);
    // The app's default staleTime is five minutes.
    const client = new QueryClient({
      defaultOptions: { queries: { staleTime: 5 * 60 * 1000 } },
    });
    client.setQueryData(getModelModesControllerGetModelModesQueryKey(), [
      { mode: 'auto', permittedModelId: 'a', anonymousPermittedModelId: 'a' },
    ]);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useModelModes(), { wrapper });

    await waitFor(() => expect(result.current.resolutions).toEqual(fresh));
  });
});
