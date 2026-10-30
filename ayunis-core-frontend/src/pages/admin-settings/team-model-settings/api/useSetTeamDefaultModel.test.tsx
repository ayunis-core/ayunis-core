import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { getTeamPermittedModelsControllerListTeamPermittedModelsQueryKey } from '@/shared/api';
import { getModelModeDefaultQueryKey } from '@/features/model-mode-defaults';
import { useSetTeamDefaultModel } from './useSetTeamDefaultModel';

const request = vi.hoisted(() => ({ fn: vi.fn() }));
vi.mock('@/shared/api', async (importOriginal) => {
  const actual = await importOriginal<object>();
  const { useMutation } = await import('@tanstack/react-query');
  return {
    ...actual,
    useTeamPermittedModelsControllerSetTeamDefaultModel: ({
      mutation,
    }: {
      mutation: object;
    }) => useMutation({ ...mutation, mutationFn: request.fn }),
  };
});
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/shared/lib/toast', () => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));

const teamId = 'team-1';
const grantsKey =
  getTeamPermittedModelsControllerListTeamPermittedModelsQueryKey(teamId);
const modeKey = getModelModeDefaultQueryKey({ level: 'team', teamId });

function setup() {
  const client = new QueryClient();
  client.setQueryData(grantsKey, [
    { id: 'old', isDefault: true },
    { id: 'new', isDefault: false },
  ]);
  client.setQueryData(modeKey, {
    mode: 'auto',
    currentPermittedModelId: 'old',
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useSetTeamDefaultModel(teamId), {
    wrapper,
  });
  return { client, result };
}

describe('useSetTeamDefaultModel', () => {
  it('shows the new model default and no mode before the request completes', async () => {
    request.fn.mockReturnValue(new Promise(() => undefined));
    const { client, result } = setup();

    act(() => result.current.setTeamDefaultModel('new'));

    await waitFor(() =>
      expect(client.getQueryData(modeKey)).toEqual({
        mode: null,
        currentPermittedModelId: null,
      }),
    );
    expect(client.getQueryData(grantsKey)).toEqual([
      { id: 'old', isDefault: false },
      { id: 'new', isDefault: true },
    ]);
  });

  it('restores the previous default and mode when saving fails', async () => {
    request.fn.mockRejectedValue(new Error('offline'));
    const { client, result } = setup();

    act(() => result.current.setTeamDefaultModel('new'));

    await waitFor(() => expect(result.current.isSetting).toBe(false));
    expect(client.getQueryData(modeKey)).toEqual({
      mode: 'auto',
      currentPermittedModelId: 'old',
    });
    expect(client.getQueryData(grantsKey)).toEqual([
      { id: 'old', isDefault: true },
      { id: 'new', isDefault: false },
    ]);
  });
});
