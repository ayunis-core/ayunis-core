import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  getModelModeDefaultsControllerGetDefaultSelectionQueryKey,
  getModelModesControllerGetModelModesQueryKey,
} from '@/shared/api';
import { getModelModeDefaultQueryKey } from '@/features/model-mode-defaults';
import { useUpdatePermittedModel } from './useUpdatePermittedModel';

vi.mock('@/shared/api', async (importOriginal) => {
  const actual = await importOriginal<object>();
  const { useMutation } = await import('@tanstack/react-query');
  return {
    ...actual,
    useModelsControllerUpdatePermittedModel: ({
      mutation,
    }: {
      mutation: object;
    }) => useMutation({ ...mutation, mutationFn: () => Promise.resolve() }),
  };
});
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/shared/lib/toast', () => ({ showError: vi.fn() }));

describe('useUpdatePermittedModel', () => {
  it('refreshes what each mode resolves to after an org model access change', async () => {
    const client = new QueryClient();
    const modeKeys = [
      getModelModeDefaultQueryKey({ level: 'org' }),
      getModelModeDefaultQueryKey({ level: 'user' }),
      getModelModeDefaultsControllerGetDefaultSelectionQueryKey(),
      getModelModesControllerGetModelModesQueryKey(),
    ];
    modeKeys.forEach((key) => client.setQueryData(key, {}));
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useUpdatePermittedModel(), {
      wrapper,
    });

    act(() =>
      result.current.updatePermittedModel({
        permittedModelId: 'p1',
        anonymousOnly: true,
      }),
    );

    await waitFor(() =>
      modeKeys.forEach((key) =>
        expect(client.getQueryState(key)?.isInvalidated).toBe(true),
      ),
    );
  });
});
