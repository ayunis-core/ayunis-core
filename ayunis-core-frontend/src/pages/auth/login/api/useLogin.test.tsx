import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useLogin } from '@/pages/auth/login/api/useLogin';

interface LoginMutationCallbacks {
  onError: (error: unknown) => void;
}

const mocks = vi.hoisted(() => ({
  callbacks: undefined as LoginMutationCallbacks | undefined,
  extractErrorData: vi.fn(),
  mutate: vi.fn(),
  navigate: vi.fn(),
  showError: vi.fn(),
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mocks.navigate,
}));
vi.mock('@/shared/api/generated/ayunisCoreAPI', () => ({
  useAuthenticationControllerLogin: () => ({
    isPending: false,
    mutate: mocks.mutate,
  }),
}));
vi.mock('@/shared/api/extract-error-data', () => ({
  default: mocks.extractErrorData,
}));
vi.mock('@/shared/lib/toast', () => ({ showError: mocks.showError }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe(useLogin.name, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.callbacks = undefined;
    mocks.mutate.mockImplementation(
      (_variables: unknown, callbacks: LoginMutationCallbacks) => {
        mocks.callbacks = callbacks;
      },
    );
  });

  it('tells a locked user to contact their administrator', () => {
    mocks.extractErrorData.mockReturnValue({
      code: 'USER_ACCOUNT_LOCKED',
      message: 'Account locked',
      status: 401,
    });
    const { result } = renderHook(() => useLogin({}));

    act(() =>
      result.current.onSubmit({
        email: 'locked.user@stadt.example',
        password: ['Wrong', 'Password', '1'].join('-'),
      }),
    );
    act(() => mocks.callbacks?.onError(new Error('request failed')));

    expect(mocks.showError).toHaveBeenCalledWith('login.error.accountLocked');
  });

  it('keeps other authentication failures generic', () => {
    mocks.extractErrorData.mockReturnValue({
      code: 'UNKNOWN_ERROR',
      message: 'Unauthorized',
      status: 401,
    });
    const { result } = renderHook(() => useLogin({}));

    act(() =>
      result.current.onSubmit({
        email: 'staff@stadt.example',
        password: ['Wrong', 'Password', '1'].join('-'),
      }),
    );
    act(() => mocks.callbacks?.onError(new Error('request failed')));

    expect(mocks.showError).toHaveBeenCalledWith(
      'login.error.invalidCredentials',
    );
  });
});
