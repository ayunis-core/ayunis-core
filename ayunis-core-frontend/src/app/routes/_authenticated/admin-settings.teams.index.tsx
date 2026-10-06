import { createFileRoute } from '@tanstack/react-router';
import SettingsLayout from '@/pages/admin-settings/admin-settings-layout/ui/AdminSettingsLayout';
import { PrototypeTeamsSettings } from '@/pages/skill-sharing-prototype';

export const Route = createFileRoute('/_authenticated/admin-settings/teams/')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <SettingsLayout title="Teams">
      <PrototypeTeamsSettings />
    </SettingsLayout>
  );
}
