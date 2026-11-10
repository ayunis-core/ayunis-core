import { act, renderHook } from '@testing-library/react';
import { AxiosError, AxiosHeaders } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMfaLoginEnroll } from '@/pages/auth/two-factor/api/useMfaLoginEnroll';
import { useVerifyMfa } from '@/pages/auth/two-factor/api/useVerifyMfa';

interface MutationOptions {
  onError: (error: unknown) => void;
}

const mocks = vi.hoisted(() => ({
  confirmOptions: undefined as MutationOptions | undefined,
  navigate: vi.fn(),
  verify: vi.fn(),
}));

vi.mock('@/features/sso', () => ({
  rememberSuccessfulSsoLogin: vi.fn(),
}));
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mocks.navigate,
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/shared/lib/toast', () => ({ showError: vi.fn() }));
vi.mock('@/shared/api/generated/ayunisCoreAPI', () => ({
  useMfaLoginControllerVerify: () => ({
    mutate: mocks.verify,
    isPending: false,
  }),
  useMfaLoginControllerSetup: () => ({ mutate: vi.fn(), isPending: false }),
  useMfaLoginControllerConfirmSetup: (options: {
    mutation: MutationOptions;
  }) => {
    mocks.confirmOptions = options.mutation;
    return { mutate: vi.fn(), isPending: false };
  },
}));

function apiError(code: string): AxiosError {
  return new AxiosError(
    'Request failed',
    'ERR_BAD_REQUEST',
    undefined,
    {},
    {
      data: { code },
      status: 401,
      statusText: 'Unauthorized',
      headers: {},
      config: { headers: new AxiosHeaders() },
    },
  );
}

// The Outlook sign-in dialog sends its handoff page as the redirect; losing it
// on the way back to the login form strands the user in the web app.
describe('restarting the login from the two-factor step', () => {
  const redirect = '/outlook/handoff?client=outlook';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(['MFA_PENDING_TOKEN_INVALID', 'MFA_LOCKED'])(
    'keeps the redirect when verification fails with %s',
    (code) => {
      const { result } = renderHook(() => useVerifyMfa({ redirect }));

      act(() => result.current.verify('123456'));
      const options = mocks.verify.mock.calls[0]?.[1] as MutationOptions;
      act(() => options.onError(apiError(code)));

      expect(mocks.navigate).toHaveBeenCalledWith({
        to: '/login',
        search: { redirect },
      });
    },
  );

  it('keeps the redirect when the enrollment window expired', () => {
    renderHook(() => useMfaLoginEnroll({ redirect }));

    act(() =>
      mocks.confirmOptions?.onError(apiError('MFA_PENDING_TOKEN_INVALID')),
    );

    expect(mocks.navigate).toHaveBeenCalledWith({
      to: '/login',
      search: { redirect },
    });
  });

  // After SSO the server sends the two-factor step with its fixed hop as the
  // redirect; the real destination sits in session storage. Forwarding the hop
  // would make a restarted SSO land on the success page itself.
  describe('after an SSO login', () => {
    const ssoHop = '/sso/success';

    it('drops the success hop when verification is locked', () => {
      const { result } = renderHook(() => useVerifyMfa({ redirect: ssoHop }));

      act(() => result.current.verify('123456'));
      const options = mocks.verify.mock.calls[0]?.[1] as MutationOptions;
      act(() => options.onError(apiError('MFA_LOCKED')));

      expect(mocks.navigate).toHaveBeenCalledWith({ to: '/login', search: {} });
    });

    it('drops the success hop when the enrollment window expired', () => {
      renderHook(() => useMfaLoginEnroll({ redirect: ssoHop }));

      act(() =>
        mocks.confirmOptions?.onError(apiError('MFA_PENDING_TOKEN_INVALID')),
      );

      expect(mocks.navigate).toHaveBeenCalledWith({ to: '/login', search: {} });
    });
  });
});
