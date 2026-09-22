import { AxiosError, AxiosHeaders } from 'axios';
import { act, renderHook } from '@testing-library/react';
import type { UseFormReturn } from 'react-hook-form';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LanguageModelFormData } from '@/pages/super-admin-settings/models-catalog/model/types';
import { useCreateLanguageModel } from './useCreateLanguageModel';
import { useUpdateLanguageModel } from './useUpdateLanguageModel';

const mocks = vi.hoisted(() => ({
  createMutationOptions: undefined as
    { onError: (error: unknown) => void } | undefined,
  updateMutationOptions: undefined as
    { onError: (error: unknown) => void } | undefined,
  invalidateQueries: vi.fn(),
  invalidateRouter: vi.fn(),
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
}));

vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ invalidate: mocks.invalidateRouter }),
}));

vi.mock('@/shared/api', () => ({
  getSuperAdminCatalogModelsControllerGetAllCatalogModelsQueryKey: () => [
    'catalog-models',
  ],
  getModelsControllerGetPermittedLanguageModelsQueryKey: () => [
    'permitted-models',
  ],
  getModelsControllerGetOrgPermittedLanguageModelsQueryKey: () => [
    'org-permitted-models',
  ],
  getModelsControllerGetAvailableLanguageModelsQueryKey: () => [
    'available-models',
  ],
  useSuperAdminLanguageCatalogModelsControllerCreateLanguageModel: (options: {
    mutation: { onError: (error: unknown) => void };
  }) => {
    mocks.createMutationOptions = options.mutation;
    return { mutate: vi.fn(), isPending: false };
  },
  useSuperAdminLanguageCatalogModelsControllerUpdateLanguageModel: (options: {
    mutation: { onError: (error: unknown) => void };
  }) => {
    mocks.updateMutationOptions = options.mutation;
    return { mutate: vi.fn(), isPending: false };
  },
}));

vi.mock('@/shared/lib/toast', () => ({
  showError: mocks.showError,
  showSuccess: mocks.showSuccess,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) =>
      key === 'models.catalog.validation.contextWindowSize.isInt'
        ? 'Context window size must be a whole number'
        : key,
  }),
}));

function validationError() {
  return new AxiosError('failed', undefined, undefined, undefined, {
    status: 400,
    statusText: 'Bad Request',
    headers: {},
    config: { headers: new AxiosHeaders() },
    data: {
      code: 'VALIDATION_ERROR',
      errors: [{ field: 'contextWindowSize', constraints: ['isInt'] }],
    },
  });
}

function formWithSetError() {
  const setError = vi.fn();
  const form = { setError } as unknown as UseFormReturn<LanguageModelFormData>;
  return { form, setError };
}

describe('language model mutation validation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('maps structured create validation errors to the form field', () => {
    const { form, setError } = formWithSetError();
    renderHook(() => useCreateLanguageModel(form));

    act(() => mocks.createMutationOptions?.onError(validationError()));

    expect(setError).toHaveBeenCalledWith('contextWindowSize', {
      message: 'Context window size must be a whole number',
    });
    expect(mocks.showError).not.toHaveBeenCalled();
  });

  it('maps structured update validation errors to the form field', () => {
    const { form, setError } = formWithSetError();
    renderHook(() => useUpdateLanguageModel(form));

    act(() => mocks.updateMutationOptions?.onError(validationError()));

    expect(setError).toHaveBeenCalledWith('contextWindowSize', {
      message: 'Context window size must be a whole number',
    });
    expect(mocks.showError).not.toHaveBeenCalled();
  });

  it('retains domain-specific create error toasts', () => {
    const { form } = formWithSetError();
    renderHook(() => useCreateLanguageModel(form));

    const error = new AxiosError('failed', undefined, undefined, undefined, {
      status: 409,
      statusText: 'Conflict',
      headers: {},
      config: { headers: new AxiosHeaders() },
      data: { code: 'MODEL_ALREADY_EXISTS' },
    });
    act(() => mocks.createMutationOptions?.onError(error));

    expect(mocks.showError).toHaveBeenCalledWith('models.alreadyExists');
  });

  it('uses the generic validation toast when field errors are absent', () => {
    const { form, setError } = formWithSetError();
    renderHook(() => useUpdateLanguageModel(form));

    const error = new AxiosError('failed', undefined, undefined, undefined, {
      status: 400,
      statusText: 'Bad Request',
      headers: {},
      config: { headers: new AxiosHeaders() },
      data: { code: 'VALIDATION_ERROR' },
    });
    act(() => mocks.updateMutationOptions?.onError(error));

    expect(setError).not.toHaveBeenCalled();
    expect(mocks.showError).toHaveBeenCalledWith('models.invalid');
  });
});
