import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import SettingsLayout from '@/pages/admin-settings/admin-settings-layout/ui/AdminSettingsLayout';
import { BrandingForm } from '@/widgets/branding-form';
import { useOrgBranding, useUpdateOrgBranding } from '@/widgets/branding-form';

export function OrganizationSettingsPage() {
  const { t } = useTranslation('admin-settings-organization');
  const { branding, isLoading } = useOrgBranding();
  const [saveKey, setSaveKey] = useState(0);
  const { updateBranding, isUpdating } = useUpdateOrgBranding({
    onSuccess: () => setSaveKey((k) => k + 1),
  });

  return (
    <SettingsLayout title={t('organization.title')}>
      <BrandingForm
        key={saveKey}
        branding={branding}
        isLoading={isLoading}
        isUpdating={isUpdating}
        onSubmit={updateBranding}
      />
    </SettingsLayout>
  );
}
