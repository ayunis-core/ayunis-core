import { useTranslation } from 'react-i18next';
import SettingsLayout from '../../admin-settings-layout';
import { AcademyRequirementCard } from './AcademyRequirementCard';

export function AcademySettingsPage() {
  const { t: tLayout } = useTranslation('admin-settings-layout');

  return (
    <SettingsLayout title={tLayout('layout.academy')}>
      <AcademyRequirementCard />
    </SettingsLayout>
  );
}
