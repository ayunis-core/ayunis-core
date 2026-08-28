import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMfaLoginEnroll } from '@/pages/auth/two-factor/api/useMfaLoginEnroll';
import { useVerifyMfa } from '@/pages/auth/two-factor/api/useVerifyMfa';

const {
  captureConfirmOptions,
  confirmEnrollment,
  navigate,
  rememberSuccessfulSsoLogin,
  setup,
  verify,
} = vi.hoisted(() => ({
  captureConfirmOptions: vi.fn(),
  confirmEnrollment: vi.fn(),
  navigate: vi.fn(),
  rememberSuccessfulSsoLogin: vi.fn(),
  setup: vi.fn(),
  verify: vi.fn(),
}));

vi.mock('@/features/sso', () => ({ rememberSuccessfulSsoLogin }));
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/shared/lib/toast', () => ({ showError: vi.fn() }));
vi.mock('@/shared/api/generated/ayunisCoreAPI', () => ({
  useMfaLoginControllerVerify: () => ({
    mutate: verify,
    isPending: false,
  }),
  useMfaLoginControllerSetup: () => ({
    mutate: setup,
    isPending: false,
  }),
  useMfaLoginControllerConfirmSetup: (options: unknown) => {
    captureConfirmOptions(options);
    return { mutate: confirmEnrollment, isPending: false };
  },
}));

describe('SSO login memory after MFA', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('confirms the pending SSO organization after MFA verification', () => {
    const { result } = renderHook(() => useVerifyMfa({ redirect: '/chat' }));

    act(() => result.current.verify('123456'));
    const options = verify.mock.calls[0]?.[1] as { onSuccess: () => void };
    act(() => options.onSuccess());

    expect(rememberSuccessfulSsoLogin).toHaveBeenCalledOnce();
  });

  it('confirms the pending SSO organization after MFA enrollment', () => {
    const { result } = renderHook(() => useMfaLoginEnroll());

    act(() => result.current.confirm('123456'));
    const options = captureConfirmOptions.mock.calls[0]?.[0] as {
      mutation: { onSuccess: (data: { recoveryCodes: string[] }) => void };
    };
    act(() => options.mutation.onSuccess({ recoveryCodes: ['recovery-code'] }));

    expect(rememberSuccessfulSsoLogin).toHaveBeenCalledOnce();
  });
});
