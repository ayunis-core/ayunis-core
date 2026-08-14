import { SettingsLayout } from '@/pages/settings/settings-layout';
import { ProfileInformationCard } from '@/pages/settings/account-settings/ui/ProfileInformationCard';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import { Button } from '@ayunis/ui/components/button';
import { useTranslation } from 'react-i18next';
import { HelpLink } from '@/shared/ui/help-link/HelpLink';
import PasswordSettingsPage from '@/pages/settings/account-settings/ui/PasswordSettingsPage';
import { TwoFactorCard } from '@/pages/settings/account-settings/ui/TwoFactorCard';
import { AcademyCertificateCard } from '@/pages/settings/account-settings/ui/AcademyCertificateCard';
import { SsoAccountCard } from '@/pages/settings/account-settings/ui/SsoAccountCard';

export default function AccountSettingsPage({
  user,
  ssoAvailable,
  ssoLinked,
}: Readonly<{
  user: { name: string; email: string };
  ssoAvailable: boolean;
  ssoLinked: boolean;
}>) {
  const { t } = useTranslation('settings');

  return (
    <SettingsLayout
      title={t('account.title')}
      action={<HelpLink path="settings/account/account/" />}
    >
      <div className="space-y-4">
        <ProfileInformationCard user={user} />
        {ssoAvailable && <SsoAccountCard linked={ssoLinked} />}
        <PasswordSettingsPage />
        <TwoFactorCard />
        <AcademyCertificateCard />
        {/* Account Actions */}
        <Card>
          <CardHeader>
            <CardTitle>{t('account.accountActions')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-destructive/20 rounded-lg">
              <div>
                <div className="font-medium">{t('account.deleteAccount')}</div>
                <div className="text-sm text-muted-foreground">
                  {t('account.deleteAccountDescription')}
                </div>
              </div>
              <Button variant="destructive">
                {t('account.deleteAccount')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </SettingsLayout>
  );
}
