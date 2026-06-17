import { createFileRoute } from '@tanstack/react-router';
import { RetentionSettingsPage } from '@/pages/admin-settings/retention-settings';

export const Route = createFileRoute(
  '/_authenticated/admin-settings/retention',
)({
  component: RouteComponent,
});

function RouteComponent() {
  return <RetentionSettingsPage />;
}
