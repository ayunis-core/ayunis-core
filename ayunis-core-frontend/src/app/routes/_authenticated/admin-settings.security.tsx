import { createFileRoute } from '@tanstack/react-router';
import { SecuritySettingsPage } from '@/pages/admin-settings/security-settings';

export const Route = createFileRoute('/_authenticated/admin-settings/security')(
  {
    component: RouteComponent,
  },
);

function RouteComponent() {
  return <SecuritySettingsPage />;
}
