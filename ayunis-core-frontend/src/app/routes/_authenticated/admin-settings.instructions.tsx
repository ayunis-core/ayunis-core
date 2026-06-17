import { createFileRoute } from '@tanstack/react-router';
import { InstructionsSettingsPage } from '@/pages/admin-settings/instructions-settings';

export const Route = createFileRoute(
  '/_authenticated/admin-settings/instructions',
)({
  component: RouteComponent,
});

function RouteComponent() {
  return <InstructionsSettingsPage />;
}
