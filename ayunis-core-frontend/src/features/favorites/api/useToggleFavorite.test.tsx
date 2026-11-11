import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getFavoritesControllerFindAllQueryKey } from '@/shared/api/generated/ayunisCoreAPI';
import type { Favorite } from './useFavorites';
import { useToggleFavorite } from './useToggleFavorite';

const { request, client } = vi.hoisted(() => ({
  request: vi.fn(),
  client: { track: vi.fn() },
}));

vi.mock('@/shared/api/client', () => ({ customAxiosInstance: request }));
vi.mock('@/shared/lib/openpanel', () => ({ openPanel: client }));
vi.mock('@/shared/lib/toast', () => ({ showError: vi.fn() }));
vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ invalidate: vi.fn() }),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const pinnedWorkspace = {
  id: 'favorite-1',
  referenceType: 'workspace',
  referenceId: 'workspace-1',
} as Favorite;

function renderToggle(favorites: Favorite[] | undefined) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  if (favorites) {
    queryClient.setQueryData(
      getFavoritesControllerFindAllQueryKey(),
      favorites,
    );
  }
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return {
    queryClient,
    result: renderHook(() => useToggleFavorite(), { wrapper }).result,
  };
}

async function toggle(
  favorites: Favorite[] | undefined,
  ...args: Parameters<ReturnType<typeof useToggleFavorite>['toggle']>
) {
  const { result } = renderToggle(favorites);
  act(() => result.current.toggle(...args));
  await vi.waitFor(() => expect(result.current.isIdle).toBe(false));
  await vi.waitFor(() => expect(result.current.isPending).toBe(false));
}

describe('favorite_added', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    request.mockResolvedValue(undefined);
    client.track.mockResolvedValue(undefined);
  });

  it('is sent with the resource type once a chat was favorited', async () => {
    await toggle([pinnedWorkspace], 'thread', 'thread-1');

    expect(client.track.mock.calls).toEqual([
      ['favorite_added', { resource_type: 'thread' }],
    ]);
  });

  it('is not sent when the resource was unfavorited', async () => {
    await toggle([pinnedWorkspace], 'workspace', 'workspace-1');

    expect(client.track).not.toHaveBeenCalled();
  });

  it('is not sent when favoriting failed', async () => {
    request.mockRejectedValue(new Error('toggle failed'));

    await toggle([], 'thread', 'thread-1');

    expect(client.track).not.toHaveBeenCalled();
  });

  it('is not sent when the favorites were never loaded, since the direction is unknown', async () => {
    await toggle(undefined, 'thread', 'thread-1');

    expect(client.track).not.toHaveBeenCalled();
  });

  it('is sent once when the same chat is favorited and unfavorited again before the list was refetched', async () => {
    const { queryClient, result } = renderToggle([]);

    act(() => {
      result.current.toggle('thread', 'thread-1');
      result.current.toggle('thread', 'thread-1');
    });
    await vi.waitFor(() => expect(queryClient.isMutating()).toBe(0));

    expect(client.track.mock.calls).toEqual([
      ['favorite_added', { resource_type: 'thread' }],
    ]);
  });
});
