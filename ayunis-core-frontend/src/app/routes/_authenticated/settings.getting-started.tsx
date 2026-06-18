import { createFileRoute } from '@tanstack/react-router';
import { SettingsGettingStartedPage } from '@/pages/getting-started';

export const Route = createFileRoute(
  '/_authenticated/settings/getting-started',
)({
  component: RouteComponent,
});

function RouteComponent() {
  return <SettingsGettingStartedPage />;
}
