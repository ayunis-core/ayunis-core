import { act, renderHook } from '@testing-library/react';
import { AxiosError, AxiosHeaders } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMfaLoginEnroll } from '@/pages/auth/two-factor/api/useMfaLoginEnroll';
import { useVerifyMfa } from '@/pages/auth/two-factor/api/useVerifyMfa';

interface MutationOptions {
  onError: (error: unknown) => void;
  retry?: boolean;
}

const mocks = vi.hoisted(() => ({
  confirmOptions: undefined as MutationOptions | undefined,
  setupOptions: undefined as MutationOptions | undefined,
  setup: vi.fn(),
  showError: vi.fn(),
  verify: vi.fn(),
  verifyOptions: undefined as MutationOptions | undefined,
}));

vi.mock('@/features/sso', () => ({
  rememberSuccessfulSsoLogin: vi.fn(),
}));
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/shared/lib/toast', () => ({ showError: mocks.showError }));
vi.mock('@/shared/api/generated/ayunisCoreAPI', () => ({
  useMfaLoginControllerVerify: (options: { mutation: MutationOptions }) => {
    mocks.verifyOptions = options.mutation;
    return {
      mutate: mocks.verify,
      isPending: false,
    };
  },
  useMfaLoginControllerSetup: (options: { mutation: MutationOptions }) => {
    mocks.setupOptions = options.mutation;
    return { mutate: mocks.setup, isPending: false };
  },
  useMfaLoginControllerConfirmSetup: (options: {
    mutation: MutationOptions;
  }) => {
    mocks.confirmOptions = options.mutation;
    return { mutate: vi.fn(), isPending: false };
  },
}));

describe('MFA service unavailable handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.confirmOptions = undefined;
    mocks.setupOptions = undefined;
    mocks.verifyOptions = undefined;
  });

  it('does not retry MFA mutations', () => {
    renderHook(() => useVerifyMfa({}));
    renderHook(() => useMfaLoginEnroll());

    expect(mocks.verifyOptions?.retry).toBe(false);
    expect(mocks.setupOptions?.retry).toBe(false);
    expect(mocks.confirmOptions?.retry).toBe(false);
  });

  it('explains when MFA verification is temporarily unavailable', () => {
    const { result } = renderHook(() => useVerifyMfa({}));

    act(() => result.current.verify('123456'));
    const options = mocks.verify.mock.calls[0]?.[1] as MutationOptions;
    act(() => options.onError(serviceUnavailableError()));

    expect(mocks.showError).toHaveBeenCalledWith('serviceUnavailable');
  });

  it('explains when MFA enrollment is temporarily unavailable', () => {
    const { result } = renderHook(() => useMfaLoginEnroll());

    act(() => mocks.setupOptions?.onError(serviceUnavailableError()));

    expect(mocks.showError).toHaveBeenCalledWith('serviceUnavailable');
    expect(result.current.setupUnavailable).toBe(true);

    act(() => result.current.retrySetup());

    expect(result.current.setupUnavailable).toBe(false);
    expect(mocks.setup).toHaveBeenCalledTimes(2);
  });

  it('keeps enrollment setup available when confirmation is temporarily unavailable', () => {
    const { result } = renderHook(() => useMfaLoginEnroll());

    act(() => mocks.confirmOptions?.onError(serviceUnavailableError()));

    expect(mocks.showError).toHaveBeenCalledWith('serviceUnavailable');
    expect(result.current.setupUnavailable).toBe(false);
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
