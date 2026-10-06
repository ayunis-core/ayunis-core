import { createFileRoute } from '@tanstack/react-router';
import SettingsLayout from '@/pages/admin-settings/admin-settings-layout/ui/AdminSettingsLayout';
import { PrototypeRolesSettings } from '@/pages/skill-sharing-prototype';

export const Route = createFileRoute('/_authenticated/admin-settings/roles')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <SettingsLayout title="Rollen & Berechtigungen">
      <PrototypeRolesSettings />
    </SettingsLayout>
  );
}
