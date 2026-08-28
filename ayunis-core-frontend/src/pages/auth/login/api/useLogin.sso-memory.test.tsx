import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useLogin } from '@/pages/auth/login/api/useLogin';

const { forgetRememberedSsoOrgId, login, navigate } = vi.hoisted(() => ({
  forgetRememberedSsoOrgId: vi.fn(),
  login: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock('@/features/sso', () => ({ forgetRememberedSsoOrgId }));

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
});
