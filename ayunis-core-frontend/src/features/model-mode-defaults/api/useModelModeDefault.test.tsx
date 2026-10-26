import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearModelModeDefaultCache,
  getModelModeDefaultQueryKey,
  useModelModeDefault,
} from './useModelModeDefault';

const api = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn() }));
vi.mock('@/shared/api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  modelModeDefaultsControllerGetUserModeDefault: api.get,
  modelModeDefaultsControllerSetUserModeDefault: api.set,
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/shared/lib/toast', () => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));

const userKey = getModelModeDefaultQueryKey({ level: 'user' });

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const hook = renderHook(() => useModelModeDefault({ level: 'user' }), {
    wrapper,
  });
  return { client, hook };
}

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockResolvedValue({ mode: null, currentPermittedModelId: null });
});

describe('useModelModeDefault', () => {
  it('shows the chosen mode before the request completes', async () => {
    api.set.mockReturnValue(new Promise(() => undefined));
    const { hook } = setup();
    await waitFor(() => expect(hook.result.current.isLoading).toBe(false));

    act(() => hook.result.current.setMode('max'));

    await waitFor(() => expect(hook.result.current.mode).toBe('max'));
    expect(hook.result.current.isSaving).toBe(true);
  });

  it('restores the previous mode when saving fails', async () => {
    api.set.mockRejectedValue(new Error('offline'));
    const { hook } = setup();
    await waitFor(() => expect(hook.result.current.isLoading).toBe(false));

    act(() => hook.result.current.setMode('max'));

    await waitFor(() => expect(hook.result.current.isSaving).toBe(false));
    expect(hook.result.current.mode).toBeNull();
  });
});

describe('useModelModeDefault saving state', () => {
  it('stays saving until the resolved model has been refetched', async () => {
    api.set.mockResolvedValue(undefined);
    const { hook } = setup();
    await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
    const refetch: { finish?: (value: unknown) => void } = {};
    api.get.mockReturnValue(
      new Promise((resolve) => {
        refetch.finish = resolve;
      }),
    );

    act(() => hook.result.current.setMode('max'));
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
    expect(hook.result.current.isSaving).toBe(true);

    act(() =>
      refetch.finish?.({
        mode: 'max',
        currentPermittedModelId: 'permit-large',
        availableModes: ['max'],
      }),
    );
    await waitFor(() => expect(hook.result.current.isSaving).toBe(false));
    expect(hook.result.current.currentPermittedModelId).toBe('permit-large');
  });
});

describe(clearModelModeDefaultCache.name, () => {
  it('clears a cached mode and can restore it', async () => {
    const client = new QueryClient();
    client.setQueryData(userKey, {
      mode: 'auto',
      currentPermittedModelId: 'permit-1',
    });

    const restore = await clearModelModeDefaultCache(client, { level: 'user' });
    expect(client.getQueryData(userKey)).toEqual({
      mode: null,
      currentPermittedModelId: null,
    });

    restore();
    expect(client.getQueryData(userKey)).toEqual({
      mode: 'auto',
      currentPermittedModelId: 'permit-1',
    });
  });
});
