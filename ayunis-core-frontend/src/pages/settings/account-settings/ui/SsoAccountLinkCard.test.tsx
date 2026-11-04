import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SsoAccountLinkCard } from './SsoAccountLinkCard';

const { status, connect } = vi.hoisted(() => ({
  status: {
    data: undefined as undefined | { canLink: boolean; isLinked: boolean },
    isPending: false,
    isError: false,
  },
  connect: { mutate: vi.fn(), isPending: false },
}));
vi.mock(
  '@/pages/settings/account-settings/api/useSsoAccountLinkStatus',
  () => ({
    useSsoAccountLinkStatus: () => status,
  }),
);
vi.mock('@/pages/settings/account-settings/api/useStartSsoAccountLink', () => ({
  useStartSsoAccountLink: () => connect,
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('SSO account linking card', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    status.data = undefined;
    status.isPending = false;
    status.isError = false;
    connect.isPending = false;
  });

  it('starts linking only for an eligible unlinked account', () => {
    status.data = { canLink: true, isLinked: false };
    render(<SsoAccountLinkCard />);
    fireEvent.click(screen.getByTestId('account-sso-connect'));
    expect(connect.mutate).toHaveBeenCalledOnce();
  });

  it('shows connected without a button for linked and JIT users', () => {
    status.data = { canLink: false, isLinked: true };
    render(<SsoAccountLinkCard />);
    expect(screen.getByTestId('account-sso-connected')).toBeTruthy();
    expect(screen.queryByTestId('account-sso-connect')).toBeNull();
  });

  it('hides the card when the backend does not offer linking', () => {
    status.data = { canLink: false, isLinked: false };
    render(<SsoAccountLinkCard />);
    expect(screen.queryByTestId('account-sso-card')).toBeNull();
  });

  it('does not claim connection before status is available', () => {
    status.isPending = true;
    render(<SsoAccountLinkCard />);
    expect(screen.queryByTestId('account-sso-connected')).toBeNull();
    expect(screen.queryByTestId('account-sso-connect')).toBeNull();
  });

  it('prevents duplicate starts while connecting', () => {
    status.data = { canLink: true, isLinked: false };
    connect.isPending = true;
    render(<SsoAccountLinkCard />);
    expect(
      screen.getByTestId('account-sso-connect').hasAttribute('disabled'),
    ).toBe(true);
  });

  it('hides stale status when the status request fails', () => {
    status.data = { canLink: false, isLinked: true };
    status.isError = true;
    render(<SsoAccountLinkCard />);
    expect(screen.queryByTestId('account-sso-card')).toBeNull();
  });
});
