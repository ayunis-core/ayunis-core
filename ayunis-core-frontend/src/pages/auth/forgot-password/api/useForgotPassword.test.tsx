import { act, renderHook } from '@testing-library/react';
import { AxiosError, AxiosHeaders } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useForgotPassword } from './useForgotPassword';

interface ForgotPasswordMutationOptions {
  onError: (error: unknown) => void;
  retry?: boolean;
}

const mocks = vi.hoisted(() => ({
  mutationOptions: undefined as ForgotPasswordMutationOptions | undefined,
  navigate: vi.fn(),
  showError: vi.fn(),
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mocks.navigate,
}));
vi.mock('@/shared/api', () => ({
  useUserPasswordResetControllerForgotPassword: (options: {
    mutation: ForgotPasswordMutationOptions;
  }) => {
    mocks.mutationOptions = options.mutation;
    return { mutate: vi.fn(), isPending: false };
  },
}));
vi.mock('@/shared/lib/toast', () => ({
  showError: mocks.showError,
  showSuccess: vi.fn(),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe(useForgotPassword.name, () => {
  beforeEach(() => vi.clearAllMocks());

  it('explains when password reset is temporarily unavailable', () => {
    renderHook(() => useForgotPassword());

    act(() => mocks.mutationOptions?.onError(serviceUnavailableError()));

    expect(mocks.showError).toHaveBeenCalledWith('serviceUnavailable');
  });

  it('does not retry password reset failures', () => {
    renderHook(() => useForgotPassword());

    expect(mocks.mutationOptions?.retry).toBe(false);
  });
});

function serviceUnavailableError(): AxiosError {
  return new AxiosError('Request failed', undefined, undefined, undefined, {
    data: { code: 'SERVICE_UNAVAILABLE' },
    status: 503,
    statusText: 'Service Unavailable',
    headers: {},
    config: { headers: new AxiosHeaders() },
  });
}
