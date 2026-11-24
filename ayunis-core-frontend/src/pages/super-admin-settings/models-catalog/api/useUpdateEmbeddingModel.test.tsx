import { AxiosError, AxiosHeaders } from 'axios';
import { act, renderHook } from '@testing-library/react';
import type { UseFormReturn } from 'react-hook-form';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EmbeddingModelFormData } from '@/pages/super-admin-settings/models-catalog/model/types';
import { useUpdateEmbeddingModel } from './useUpdateEmbeddingModel';

const mocks = vi.hoisted(() => ({
  updateMutationOptions: undefined as
    { onError: (error: unknown) => void } | undefined,
  showError: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ invalidate: vi.fn() }),
}));

vi.mock('@ayunis/api-client', () => ({
  getSuperAdminCatalogModelsControllerGetAllCatalogModelsQueryKey: () => [
    'catalog-models',
  ],
  useSuperAdminEmbeddingCatalogModelsControllerUpdateEmbeddingModel: (options: {
    mutation: { onError: (error: unknown) => void };
  }) => {
    mocks.updateMutationOptions = options.mutation;
    return { mutate: vi.fn(), isPending: false };
  },
}));

vi.mock('@/shared/lib/toast', () => ({
  showError: mocks.showError,
  showSuccess: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) =>
      key.endsWith('.embeddingModelInUse') ? `translated ${key}` : key,
  }),
}));

function conflict(data: Record<string, unknown>) {
  return new AxiosError('failed', undefined, undefined, undefined, {
    status: 409,
    statusText: 'Conflict',
    headers: {},
    config: { headers: new AxiosHeaders() },
    data,
  });
}

function renderWithForm() {
  const setError = vi.fn();
  const form = {
    setError,
  } as unknown as UseFormReturn<EmbeddingModelFormData>;
  renderHook(() => useUpdateEmbeddingModel(form));
  return setError;
}

describe('useUpdateEmbeddingModel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('shows an in-use rejection on each rejected field instead of a failure toast', () => {
    const setError = renderWithForm();

    act(() =>
      mocks.updateMutationOptions?.onError(
        conflict({
          code: 'EMBEDDING_MODEL_IN_USE',
          metadata: { fields: ['name', 'dimensions'] },
        }),
      ),
    );

    expect(setError).toHaveBeenCalledWith('name', {
      message: 'translated models.catalog.validation.name.embeddingModelInUse',
    });
    expect(setError).toHaveBeenCalledWith('dimensions', {
      message:
        'translated models.catalog.validation.dimensions.embeddingModelInUse',
    });
    expect(mocks.showError).not.toHaveBeenCalled();
  });

  it('keeps domain error toasts for other conflicts', () => {
    const setError = renderWithForm();

    act(() =>
      mocks.updateMutationOptions?.onError(
        conflict({ code: 'MODEL_ALREADY_EXISTS' }),
      ),
    );

    expect(setError).not.toHaveBeenCalled();
    expect(mocks.showError).toHaveBeenCalledWith('models.alreadyExists');
  });
});
