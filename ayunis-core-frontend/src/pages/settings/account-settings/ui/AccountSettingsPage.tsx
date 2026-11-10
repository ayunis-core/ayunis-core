import { SettingsLayout } from '@/pages/settings/settings-layout';
import { ProfileInformationCard } from '@/pages/settings/account-settings/ui/ProfileInformationCard';
import { useTranslation } from 'react-i18next';
import { HelpLink } from '@/shared/ui/help-link/HelpLink';
import PasswordSettingsPage from '@/pages/settings/account-settings/ui/PasswordSettingsPage';
import { TwoFactorCard } from '@/pages/settings/account-settings/ui/TwoFactorCard';
import { AcademyCertificateCard } from '@/pages/settings/account-settings/ui/AcademyCertificateCard';
import { SsoAccountLinkCard } from './SsoAccountLinkCard';

export default function AccountSettingsPage({
  user,
  isSsoEnabled,
}: Readonly<{
  user: { name: string; email: string };
  isSsoEnabled: boolean;
}>) {
  const { t } = useTranslation('settings');

  return (
    <SettingsLayout
      title={t('account.title')}
      action={<HelpLink path="settings/account/account/" />}
    >
      <div className="space-y-4" data-testid="account-settings-page">
        <ProfileInformationCard user={user} />
        <SsoAccountLinkCard />
        {!isSsoEnabled && (
          <>
            <div data-testid="account-password-settings">
              <PasswordSettingsPage />
            </div>
            <div data-testid="account-two-factor-settings">
              <TwoFactorCard />
            </div>
          </>
        )}
        <AcademyCertificateCard />
      </div>
    </SettingsLayout>
  );
}
