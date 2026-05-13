import { createFileRoute } from '@tanstack/react-router';
import { OrganizationSettingsPage } from '@/pages/admin-settings/organization-settings';

export const Route = createFileRoute(
  '/_authenticated/admin-settings/organization',
)({
  component: RouteComponent,
});

function RouteComponent() {
  return <OrganizationSettingsPage />;
}
