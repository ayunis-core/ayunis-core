import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginPage } from '@/pages/auth/login/ui/LoginPage';

const {
  beginSso,
  discover,
  discoveryState,
  login,
  loginState,
  navigate,
  showError,
} = vi.hoisted(() => ({
  beginSso: vi.fn(),
  discover: vi.fn(),
  discoveryState: { isPending: false },
  login: vi.fn(),
  loginState: { isPending: false },
  navigate: vi.fn(),
  showError: vi.fn(),
}));

vi.mock('@/features/sso', () => ({
  beginSso,
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
    loginState.isPending = false;
  });

  it('keeps the existing password login when SSO login is disabled', async () => {
    render(<LoginPage ssoLoginEnabled={false} />);

    fireEvent.change(screen.getByTestId('email'), {
      target: { value: 'local@example.com' },
    });
    fireEvent.change(screen.getByTestId('password'), {
      target: { value: 'LocalPassword01!' },
    });
    fireEvent.click(screen.getByTestId('submit'));

    await waitFor(() => expect(login).toHaveBeenCalledOnce());
    expect(discover).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'login.continue' })).toBeNull();
  });

  it('locks the email while SSO discovery is pending', () => {
    discoveryState.isPending = true;

    render(<LoginPage ssoLoginEnabled />);

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
    render(<LoginPage ssoLoginEnabled />);

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
    render(<LoginPage redirect="/settings/account" ssoLoginEnabled />);

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

  it('clears the password when the email is changed', async () => {
    discover.mockResolvedValue({ available: false });
    render(<LoginPage ssoLoginEnabled />);

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
    render(<LoginPage ssoLoginEnabled />);

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
    render(<LoginPage ssoLoginEnabled />);

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
    render(<LoginPage ssoLoginEnabled />);

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
    render(<LoginPage ssoLoginEnabled />);

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
    render(<LoginPage ssoLoginEnabled />);

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
