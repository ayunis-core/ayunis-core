import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginPage } from '@/pages/auth/login/ui/LoginPage';

const {
  beginSso,
  discover,
  discoveryState,
  forgetRememberedSsoOrgId,
  getRememberedSsoOrgId,
  login,
  loginState,
  navigate,
  showError,
} = vi.hoisted(() => ({
  beginSso: vi.fn(),
  discover: vi.fn(),
  discoveryState: { isPending: false },
  forgetRememberedSsoOrgId: vi.fn(),
  getRememberedSsoOrgId: vi.fn(),
  login: vi.fn(),
  loginState: { isPending: false },
  navigate: vi.fn(),
  showError: vi.fn(),
}));

vi.mock('@/features/sso', () => ({
  beginSso,
  forgetRememberedSsoOrgId,
  getRememberedSsoOrgId,
  useDiscoverSso: () => ({ discover, isPending: discoveryState.isPending }),
}));

vi.mock('@/features/useRedirectNotification', () => ({
  useRedirectNotification: vi.fn(),
}));

vi.mock('@/shared/lib/toast', () => ({ showError }));

vi.mock('@/shared/api/generated/ayunisCoreAPI', () => ({
  useAuthenticationControllerLogin: () => ({
    mutate: login,
    isPending: loginState.isPending,
  }),
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
  useNavigate: () => navigate,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/layouts/onboarding-layout', () => ({
  default: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));

describe(LoginPage.name, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    discoveryState.isPending = false;
    getRememberedSsoOrgId.mockReturnValue(null);
    loginState.isPending = false;
  });

  it('offers the remembered organization before asking for an email', () => {
    getRememberedSsoOrgId.mockReturnValue(
      'f4fcdc42-176e-4d32-bd5b-6dad8d2426b4',
    );

    render(<LoginPage redirect="/settings/account" />);

    expect(screen.queryByTestId('email')).toBeNull();

    fireEvent.click(screen.getByTestId('login-remembered-sso'));

    expect(beginSso).toHaveBeenCalledWith(
      'f4fcdc42-176e-4d32-bd5b-6dad8d2426b4',
      '/settings/account',
    );
  });

  it('forgets the organization when another account is chosen', () => {
    getRememberedSsoOrgId.mockReturnValue(
      'f4fcdc42-176e-4d32-bd5b-6dad8d2426b4',
    );
    render(<LoginPage />);

    fireEvent.click(screen.getByTestId('login-use-another-account'));

    expect(forgetRememberedSsoOrgId).toHaveBeenCalledOnce();
    expect(screen.getByTestId('email')).toBeTruthy();
    expect(screen.getByTestId('login-continue')).toBeTruthy();
  });

  it('starts with SSO discovery before showing login methods', () => {
    render(<LoginPage />);

    expect(screen.getByRole('button', { name: 'login.continue' })).toBeTruthy();
    expect(screen.queryByTestId('password')).toBeNull();
  });

  it('locks the email while SSO discovery is pending', () => {
    discoveryState.isPending = true;

    render(<LoginPage />);

    expect(screen.getByTestId('email').hasAttribute('disabled')).toBe(true);
    expect(
      screen
        .getByRole('button', {
          name: 'login.checkingEmail',
        })
        .hasAttribute('disabled'),
    ).toBe(true);
  });

  it('validates the email before discovery', async () => {
    render(<LoginPage />);

    fireEvent.change(screen.getByTestId('email'), {
      target: { value: 'not-an-email' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'login.continue' }));

    await screen.findByText('login.emailInvalid');
    expect(discover).not.toHaveBeenCalled();
  });

  it('offers SSO and local password login when discovery succeeds', async () => {
    discover.mockResolvedValue({
      available: true,
      orgId: 'f4fcdc42-176e-4d32-bd5b-6dad8d2426b4',
    });
    render(<LoginPage redirect="/settings/account" />);

    fireEvent.change(screen.getByTestId('email'), {
      target: { value: 'siro@qa-stadt.local' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'login.continue' }));

    const ssoButton = await screen.findByRole('button', {
      name: 'login.signInWithSso',
    });
    expect(screen.getByTestId('password')).toBeTruthy();

    fireEvent.click(ssoButton);
    expect(beginSso).toHaveBeenCalledWith(
      'f4fcdc42-176e-4d32-bd5b-6dad8d2426b4',
      '/settings/account',
    );
  });

  it('shows only SSO when the organization disables local password login', async () => {
    discover.mockResolvedValue({
      available: true,
      orgId: 'f4fcdc42-176e-4d32-bd5b-6dad8d2426b4',
      localPasswordLoginEnabled: false,
    });
    render(<LoginPage />);

    fireEvent.change(screen.getByTestId('email'), {
      target: { value: 'siro@qa-stadt.local' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'login.continue' }));

    expect(
      await screen.findByRole('button', { name: 'login.signInWithSso' }),
    ).toBeTruthy();
    expect(screen.queryByTestId('password')).toBeNull();
    expect(screen.queryByTestId('submit')).toBeNull();
    expect(screen.queryByText('login.orUsePassword')).toBeNull();
    expect(screen.queryByText('login.forgotPassword')).toBeNull();
  });

  it('clears the password when the email is changed', async () => {
    discover.mockResolvedValue({ available: false });
    render(<LoginPage />);

    fireEvent.change(screen.getByTestId('email'), {
      target: { value: 'first@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'login.continue' }));
    const password = await screen.findByTestId('password');
    fireEvent.change(password, { target: { value: 'do-not-retain' } });

    fireEvent.click(screen.getByRole('button', { name: 'login.changeEmail' }));
    fireEvent.change(screen.getByTestId('email'), {
      target: { value: 'second@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'login.continue' }));

    expect(
      (await screen.findByTestId<HTMLInputElement>('password')).value,
    ).toBe('');
  });

  it('disables alternate authentication actions while login is pending', async () => {
    loginState.isPending = true;
    discover.mockResolvedValue({
      available: true,
      orgId: 'f4fcdc42-176e-4d32-bd5b-6dad8d2426b4',
    });
    render(<LoginPage />);

    fireEvent.change(screen.getByTestId('email'), {
      target: { value: 'siro@qa-stadt.local' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'login.continue' }));

    expect(
      (
        await screen.findByRole('button', { name: 'login.signInWithSso' })
      ).hasAttribute('disabled'),
    ).toBe(true);
    expect(
      screen
        .getByRole('button', { name: 'login.changeEmail' })
        .hasAttribute('disabled'),
    ).toBe(true);
  });

  it('treats Enter on the email step as continue', async () => {
    discover.mockResolvedValue({ available: false });
    render(<LoginPage />);

    const email = screen.getByTestId('email');
    fireEvent.change(email, { target: { value: 'local@example.com' } });
    fireEvent.submit(email.closest('form') as HTMLFormElement);

    await waitFor(() => {
      expect(discover).toHaveBeenCalledWith('local@example.com');
    });
    expect(screen.getByTestId('password')).toBeTruthy();
  });

  it('keeps local login available when no SSO connection is found', async () => {
    discover.mockResolvedValue({ available: false });
    render(<LoginPage />);

    fireEvent.change(screen.getByTestId('email'), {
      target: { value: 'local@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'login.continue' }));

    await waitFor(() => expect(discover).toHaveBeenCalledOnce());
    expect(screen.queryByText('login.signInWithSso')).toBeNull();
    expect(screen.getByTestId('password')).toBeTruthy();
  });

  it('keeps local login available when discovery fails', async () => {
    discover.mockRejectedValue(new Error('network unavailable'));
    render(<LoginPage />);

    fireEvent.change(screen.getByTestId('email'), {
      target: { value: 'local@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'login.continue' }));

    await waitFor(() => {
      expect(showError).toHaveBeenCalledWith('login.ssoDiscoveryFailed');
    });
    expect(screen.queryByText('login.signInWithSso')).toBeNull();
    expect(screen.getByTestId('password')).toBeTruthy();
  });

  it('preserves password login after email discovery', async () => {
    const passwordValue = ['Local', 'Password', '01!'].join('');
    discover.mockResolvedValue({ available: false });
    render(<LoginPage />);

    fireEvent.change(screen.getByTestId('email'), {
      target: { value: 'local@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'login.continue' }));
    const password = await screen.findByTestId('password');
    fireEvent.change(password, { target: { value: passwordValue } });
    fireEvent.click(screen.getByRole('button', { name: 'login.signInButton' }));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith(
        {
          data: {
            email: 'local@example.com',
            password: passwordValue,
          },
        },
        expect.objectContaining({
          onSuccess: expect.any(Function),
          onError: expect.any(Function),
        }),
      );
    });
  });
});
