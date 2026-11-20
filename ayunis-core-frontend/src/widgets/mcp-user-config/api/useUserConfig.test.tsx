import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getMcpIntegrationsControllerGetUserConfigQueryKey } from '@/shared/api/generated/ayunisCoreAPI';
import type { UserConfigResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { SECRET_MASK } from '@/shared/constants/secret-mask';
import {
  useDeleteUserConfig,
  useGetUserConfig,
  useSetUserConfig,
} from './useUserConfig';

const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('@/shared/api/client', () => ({ customAxiosInstance: request }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/shared/lib/toast', () => ({
  showSuccess: vi.fn(),
  showError: vi.fn(),
}));

const integrationId = 'personal-mcp';
const key = getMcpIntegrationsControllerGetUserConfigQueryKey(integrationId);
const otherKey = getMcpIntegrationsControllerGetUserConfigQueryKey('other-mcp');
const original: UserConfigResponseDto = {
  hasConfig: true,
  configValues: { label: 'original', token: SECRET_MASK },
};
const saved: UserConfigResponseDto = {
  hasConfig: true,
  configValues: { label: 'updated', token: SECRET_MASK },
};
const empty: UserConfigResponseDto = { hasConfig: false, configValues: {} };
let client: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  request.mockReset();
  client = new QueryClient({
    defaultOptions: {
      queries: { staleTime: 300_000, retry: false },
      mutations: { retry: false },
    },
  });
  client.setQueryData(key, original);
  client.setQueryData(otherKey, original);
  request.mockResolvedValue(saved);
});
afterEach(() => {
  cleanup();
  client.clear();
});

function renderMutations(close: () => void) {
  return renderHook(
    () => ({
      save: useSetUserConfig(integrationId, close),
      remove: useDeleteUserConfig(integrationId, close),
    }),
    { wrapper },
  );
}

describe.each(['save', 'disconnect'] as const)(
  'personal MCP %s cache',
  (operation) => {
    function mutate(result: ReturnType<typeof renderMutations>['result']) {
      if (operation === 'save')
        result.current.save.setUserConfig({
          label: 'updated',
          token: 'raw-candidate-token',
        });
      else result.current.remove.disconnect();
    }
    const expected = operation === 'save' ? saved : empty;

    it('reopens with the authoritative configuration before the success callback and leaves another integration alone', async () => {
      const close = vi.fn(() =>
        expect(client.getQueryData(key)).toEqual(expected),
      );
      const { result } = renderMutations(close);
      act(() => mutate(result));
      await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
      expect(client.getQueryData(key)).toEqual(expected);
      expect(client.getQueryData(otherKey)).toEqual(original);
      expect(JSON.stringify(client.getQueryData(key))).not.toContain(
        'raw-candidate-token',
      );
    });

    it('prevents a configuration read started before the mutation from restoring an old value', async () => {
      let finishRead!: (value: UserConfigResponseDto) => void;
      const read = new Promise<UserConfigResponseDto>((resolve) => {
        finishRead = resolve;
      });
      request.mockImplementation(({ method }: { method: string }) =>
        method === 'GET' ? read : Promise.resolve(saved),
      );
      renderHook(() => useGetUserConfig(integrationId), { wrapper });
      act(() => {
        void client.invalidateQueries({ queryKey: key, exact: true });
      });
      await waitFor(() =>
        expect(request).toHaveBeenCalledWith(
          expect.objectContaining({ method: 'GET' }),
        ),
      );
      const close = vi.fn();
      const { result } = renderMutations(close);
      act(() => mutate(result));
      await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
      await act(async () => {
        finishRead(original);
        await Promise.resolve();
      });
      expect(client.getQueryData(key)).toEqual(expected);
    });

    it('keeps the previous configuration and the form open when the mutation fails', async () => {
      request.mockRejectedValue(new Error('verification unavailable'));
      const close = vi.fn();
      const { result } = renderMutations(close);
      act(() => mutate(result));
      await waitFor(() =>
        expect(client.getMutationCache().getAll()[0]?.state.status).toBe(
          'error',
        ),
      );
      expect(close).not.toHaveBeenCalled();
      expect(client.getQueryData(key)).toEqual(original);
      expect(client.getQueryData(otherKey)).toEqual(original);
    });
  },
);
