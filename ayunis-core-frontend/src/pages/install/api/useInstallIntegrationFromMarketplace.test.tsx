import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UseFormReturn } from 'react-hook-form';
import type { InstallIntegrationFormFields } from '@/pages/install/model/types';
import { useInstallIntegrationFromMarketplace } from './useInstallIntegrationFromMarketplace';

const mocks = vi.hoisted(() => ({
  onError: undefined as ((error: unknown) => void) | undefined,
  errorData: {},
  showError: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));
vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ navigate: vi.fn() }),
}));
vi.mock('@/shared/api/generated/ayunisCoreAPI', () => ({
  getMcpIntegrationsControllerListQueryKey: () => ['integrations'],
  useMcpIntegrationsControllerInstallFromMarketplace: (options: {
    mutation: { onError: (error: unknown) => void };
  }) => {
    mocks.onError = options.mutation.onError;
    return { mutate: vi.fn(), isPending: false };
  },
}));
vi.mock('@/shared/lib/toast', () => ({
  showError: mocks.showError,
  showSuccess: vi.fn(),
}));
vi.mock('@/shared/api/extract-error-data', () => ({
  default: () => mocks.errorData,
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe(useInstallIntegrationFromMarketplace.name, () => {
  const setError = vi.fn();
  const form = {
    setError,
  } as unknown as UseFormReturn<InstallIntegrationFormFields>;

  beforeEach(() => vi.clearAllMocks());

  it.each([
    { code: 'INVALID_SERVER_URL' },
    {
      code: 'VALIDATION_ERROR',
      errors: [{ field: 'serverUrl', constraints: ['isUrl'] }],
    },
  ])('shows a rejected server URL on the field ($code)', (errorData) => {
    mocks.errorData = errorData;
    renderHook(() => useInstallIntegrationFromMarketplace(form));

    mocks.onError?.(new Error('rejected'));

    expect(setError).toHaveBeenCalledWith('serverUrl', {
      message: 'serverUrl.invalid',
    });
    expect(mocks.showError).not.toHaveBeenCalled();
  });

  it('keeps showing other errors as a toast', () => {
    mocks.errorData = { code: 'DUPLICATE_MCP_INTEGRATION' };
    renderHook(() => useInstallIntegrationFromMarketplace(form));

    mocks.onError?.(new Error('duplicate'));

    expect(setError).not.toHaveBeenCalled();
    expect(mocks.showError).toHaveBeenCalledWith('error.alreadyInstalled');
  });
});
