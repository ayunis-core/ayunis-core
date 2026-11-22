import { useTranslation } from 'react-i18next';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import SettingsLayout from '@/pages/admin-settings/admin-settings-layout';
import { OutlookAddinSection } from './OutlookAddinSection';

export function OfficeAddinsPage() {
  const { t } = useTranslation('admin-settings-integrations');
  const { t: tLayout } = useTranslation('admin-settings-layout');

  return (
    <SettingsLayout
      breadcrumbs={[
        {
          label: tLayout('layout.integrations'),
          href: '/admin-settings/integrations',
        },
        { label: t('integrations.officeAddins.title') },
      ]}
    >
      <div className="space-y-4">
        <OutlookAddinSection />
        <Card data-testid="office-add-ins-coming-soon">
          <CardHeader>
            <CardTitle>
              {t('integrations.officeAddins.comingSoon.title')}
            </CardTitle>
            <CardDescription>
              {t('integrations.officeAddins.comingSoon.description')}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </SettingsLayout>
  );
}
