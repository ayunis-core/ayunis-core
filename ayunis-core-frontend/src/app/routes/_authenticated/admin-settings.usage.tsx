import { createFileRoute } from '@tanstack/react-router';
import UsageSettingsPage from '@/pages/admin-settings/usage-settings';

export const Route = createFileRoute('/_authenticated/admin-settings/usage')({
  component: RouteComponent,
});

function RouteComponent() {
  return <UsageSettingsPage />;
}
