import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SsoAccountCard } from '@/pages/settings/account-settings/ui/SsoAccountCard';

const { startLink, useRedirectNotification } = vi.hoisted(() => ({
  startLink: vi.fn(),
  useRedirectNotification: vi.fn(),
}));

vi.mock('@/features/sso', () => ({
  useStartSsoLink: () => ({ startLink, isPending: false }),
}));
vi.mock('@/features/useRedirectNotification', () => ({
  useRedirectNotification,
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe(SsoAccountCard.name, () => {
  beforeEach(() => vi.clearAllMocks());

  it('starts an explicit account-link transaction', () => {
    render(<SsoAccountCard linked={false} />);

    fireEvent.click(
      screen.getByRole('button', { name: 'account.sso.linkButton' }),
    );
    expect(startLink).toHaveBeenCalledOnce();
  });

  it('shows the completion notice after returning from the broker', () => {
    render(<SsoAccountCard linked />);

    expect(useRedirectNotification).toHaveBeenCalledWith({
      show: true,
      text: 'account.sso.linkSuccess',
    });
  });
});
