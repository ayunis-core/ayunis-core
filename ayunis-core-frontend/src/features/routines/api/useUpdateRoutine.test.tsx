import type { ReactNode } from 'react';
import {
  CancelledError,
  QueryClient,
  QueryClientProvider,
  useMutation,
} from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useUpdateRoutine } from './useUpdateRoutine';

const { update } = vi.hoisted(() => ({ update: vi.fn() }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/shared/lib/toast', () => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));
vi.mock('@/shared/api/generated/ayunisCoreAPI', () => ({
  getRoutinesControllerFindAllQueryKey: () => ['routines'],
  getRoutinesControllerFindOneQueryKey: (id: string) => ['routines', id],
  useRoutinesControllerUpdate: ({
    mutation,
  }: {
    mutation: { onSuccess: (routine: unknown) => Promise<void> | void };
  }) =>
    useMutation({
      mutationFn: (variables: { id: string; data: unknown }) =>
        update(variables) as Promise<unknown>,
      onSuccess: mutation.onSuccess,
    }),
}));

describe('useUpdateRoutine', () => {
  it('keeps the saved routine when a poll that started before the save lands afterwards', async () => {
    const queryClient = new QueryClient();
    const key = ['routines', 'routine-id'];
    let finishPoll: ((routine: unknown) => void) | undefined;
    const poll = queryClient
      .query({
        queryKey: key,
        queryFn: () =>
          new Promise((resolve) => {
            finishPoll = resolve;
          }),
      })
      .catch((error: unknown) => error);
    update.mockResolvedValue({ id: 'routine-id', enabled: false });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useUpdateRoutine(), { wrapper });

    act(() => result.current.updateRoutine('routine-id', { enabled: false }));
    await waitFor(() =>
      expect(queryClient.getQueryData(key)).toEqual({
        id: 'routine-id',
        enabled: false,
      }),
    );
    finishPoll?.({ id: 'routine-id', enabled: true });

    expect(await poll).toBeInstanceOf(CancelledError);

    expect(queryClient.getQueryData(key)).toEqual({
      id: 'routine-id',
      enabled: false,
    });
  });
});
