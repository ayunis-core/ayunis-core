import { createFileRoute } from '@tanstack/react-router';
import PlatformConfigPage from '@/pages/super-admin-settings/platform-config';

export const Route = createFileRoute(
  '/_authenticated/super-admin-settings/platform-config/',
)({
  component: RouteComponent,
});

function RouteComponent() {
  return <PlatformConfigPage />;
}
