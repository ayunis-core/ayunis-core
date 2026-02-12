import { createFileRoute } from '@tanstack/react-router';
import GlobalUsagePage from '@/pages/super-admin-settings/usage';

export const Route = createFileRoute(
  '/_authenticated/super-admin-settings/usage/',
)({
  component: RouteComponent,
});

function RouteComponent() {
  return <GlobalUsagePage />;
}
