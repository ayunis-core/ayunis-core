import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useLogin } from '@/pages/auth/login/api/useLogin';

const {
  extractErrorData,
  forgetRememberedSsoOrgId,
  login,
  navigate,
  showError,
} = vi.hoisted(() => ({
  extractErrorData: vi.fn(),
  forgetRememberedSsoOrgId: vi.fn(),
  login: vi.fn(),
  navigate: vi.fn(),
  showError: vi.fn(),
}));

vi.mock('@/features/sso', () => ({ forgetRememberedSsoOrgId }));
vi.mock('@/shared/api/extract-error-data', () => ({
  default: extractErrorData,
}));
vi.mock('@/shared/lib/toast', () => ({ showError }));

vi.mock('@/shared/api/generated/ayunisCoreAPI', () => ({
  useAuthenticationControllerLogin: () => ({
    mutate: login,
    isPending: false,
  }),
}));

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe(useLogin.name, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('clears pending SSO memory before local MFA', () => {
    const password = ['Local', 'Password', '01!'].join('');
    const { result } = renderHook(() => useLogin({ redirect: '/chat' }));

    act(() => {
      result.current.onSubmit({
        email: 'local@example.com',
        password,
      });
    });

    const options = login.mock.calls[0]?.[1] as {
      onSuccess: (data: {
        mfaRequired: boolean;
        enrollmentRequired: boolean;
      }) => void;
    };

    act(() => {
      options.onSuccess({ mfaRequired: true, enrollmentRequired: false });
    });

    expect(forgetRememberedSsoOrgId).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith({
      to: '/two-factor',
      search: { redirect: '/chat', enroll: undefined },
    });
  });

  it('shows the SSO action when a stale password form is rejected', () => {
    const password = ['Valid', 'Password', '01!'].join('');
    const { result } = renderHook(() => useLogin({}));
    extractErrorData.mockReturnValue({
      code: 'LOCAL_PASSWORD_LOGIN_DISABLED',
      status: 403,
    });

    act(() => {
      result.current.onSubmit({
        email: 'staff@stadt.example',
        password,
      });
    });
    const options = login.mock.calls[0]?.[1] as {
      onError: (error: unknown) => void;
    };
    act(() => options.onError(new Error('rejected')));

    expect(showError).toHaveBeenCalledWith('login.error.ssoRequired');
  });
});
