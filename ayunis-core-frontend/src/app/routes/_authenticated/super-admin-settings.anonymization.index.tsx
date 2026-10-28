import { createFileRoute } from '@tanstack/react-router';
import AnonymizationWhitelistPage from '@/pages/super-admin-settings/anonymization-whitelist';

export const Route = createFileRoute(
  '/_authenticated/super-admin-settings/anonymization/',
)({
  component: RouteComponent,
});

function RouteComponent() {
  return <AnonymizationWhitelistPage />;
}
