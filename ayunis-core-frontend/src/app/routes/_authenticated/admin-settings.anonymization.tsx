import { createFileRoute } from '@tanstack/react-router';
import { AnonymizationSettingsPage } from '@/pages/admin-settings/anonymization-settings';

export const Route = createFileRoute(
  '/_authenticated/admin-settings/anonymization',
)({
  component: RouteComponent,
});

function RouteComponent() {
  return <AnonymizationSettingsPage />;
}
