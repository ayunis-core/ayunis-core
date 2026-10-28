import { createFileRoute } from '@tanstack/react-router';
import AppAlertsPage from '@/pages/super-admin-settings/app-alerts';

export const Route = createFileRoute(
  '/_authenticated/super-admin-settings/app-alerts/',
)({
  component: RouteComponent,
});

function RouteComponent() {
  return <AppAlertsPage />;
}
