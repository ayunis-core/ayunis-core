import { createFileRoute } from '@tanstack/react-router';
import { RolesSettingsPage } from '@/pages/admin-settings/roles-settings';

export const Route = createFileRoute('/_authenticated/admin-settings/roles')({
  component: RouteComponent,
});

function RouteComponent() {
  return <RolesSettingsPage />;
}
