import { createFileRoute, redirect } from '@tanstack/react-router';
import AppAlertsPage from '@/pages/super-admin-settings/app-alerts';
import { MeResponseDtoSystemRole } from '@/shared/api/generated/ayunisCoreAPI.schemas';

export const Route = createFileRoute(
  '/_authenticated/super-admin-settings/app-alerts/',
)({
  component: RouteComponent,
  beforeLoad: ({ context: { user } }) => {
    if (user.systemRole !== MeResponseDtoSystemRole.super_admin) {
      throw redirect({ to: '/' });
    }
  },
});

function RouteComponent() {
  return <AppAlertsPage />;
}
