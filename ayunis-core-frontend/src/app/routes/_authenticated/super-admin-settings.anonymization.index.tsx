import { createFileRoute, redirect } from '@tanstack/react-router';
import AnonymizationWhitelistPage from '@/pages/super-admin-settings/anonymization-whitelist';
import { MeResponseDtoSystemRole } from '@/shared/api/generated/ayunisCoreAPI.schemas';

export const Route = createFileRoute(
  '/_authenticated/super-admin-settings/anonymization/',
)({
  component: RouteComponent,
  beforeLoad: ({ context: { user } }) => {
    if (user.systemRole !== MeResponseDtoSystemRole.super_admin) {
      throw redirect({ to: '/' });
    }
  },
});

function RouteComponent() {
  return <AnonymizationWhitelistPage />;
}
