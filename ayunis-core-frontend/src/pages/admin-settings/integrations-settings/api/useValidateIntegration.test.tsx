import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useValidateIntegration } from './useValidateIntegration';

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  mutationOptions: undefined as
    | {
        onSuccess: (data: {
          valid: boolean;
          error?: string;
          capabilities?: { prompts: number; resources: number; tools: number };
        }) => void;
      }
    | undefined,
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));

vi.mock('@/shared/api/generated/ayunisCoreAPI', () => ({
  useMcpIntegrationsControllerValidate: (options: {
    mutation: {
      onSuccess: (data: {
        valid: boolean;
        error?: string;
        capabilities?: { prompts: number; resources: number; tools: number };
      }) => void;
    };
  }) => {
    mocks.mutationOptions = options.mutation;
    return { mutate: mocks.mutate };
  },
}));
vi.mock('@/shared/lib/toast', () => ({
  showError: mocks.showError,
  showSuccess: mocks.showSuccess,
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { message?: string }) =>
      options?.message ? `${key}:${options.message}` : key,
  }),
}));

describe(useValidateIntegration.name, () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the backend reason when validation returns valid false', () => {
    renderHook(() => useValidateIntegration());

    act(() => {
      mocks.mutationOptions?.onSuccess({
        valid: false,
        error: 'Connection refused',
        capabilities: { prompts: 0, resources: 0, tools: 0 },
      });
    });

    expect(mocks.showError).toHaveBeenCalledWith(
      'integrations.validateIntegration.errorWithReason:Connection refused',
    );
  });

  it('falls back to the generic message when validation returns no reason', () => {
    renderHook(() => useValidateIntegration());

    act(() => {
      mocks.mutationOptions?.onSuccess({
        valid: false,
        capabilities: { prompts: 0, resources: 0, tools: 0 },
      });
    });

    expect(mocks.showError).toHaveBeenCalledWith(
      'integrations.validateIntegration.error',
    );
  });
});
