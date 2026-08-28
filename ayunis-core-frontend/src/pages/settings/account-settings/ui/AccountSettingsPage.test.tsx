import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import AccountSettingsPage from '@/pages/settings/account-settings/ui/AccountSettingsPage';

vi.mock('@/pages/settings/settings-layout', () => ({
  SettingsLayout: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('@/pages/settings/account-settings/ui/ProfileInformationCard', () => ({
  ProfileInformationCard: () => null,
}));
vi.mock('@/pages/settings/account-settings/ui/PasswordSettingsPage', () => ({
  default: () => null,
}));
vi.mock('@/pages/settings/account-settings/ui/TwoFactorCard', () => ({
  TwoFactorCard: () => null,
}));
vi.mock('@/pages/settings/account-settings/ui/AcademyCertificateCard', () => ({
  AcademyCertificateCard: () => null,
}));
vi.mock('@/shared/ui/help-link/HelpLink', () => ({ HelpLink: () => null }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe(AccountSettingsPage.name, () => {
  it('does not offer organization SSO account linking', () => {
    render(
      <AccountSettingsPage
        user={{ name: 'Admin', email: 'admin@stadt.example' }}
      />,
    );

    expect(screen.getByTestId('account-settings-page')).toBeTruthy();
    expect(screen.queryByText('account.sso.title')).toBeNull();
  });
});
