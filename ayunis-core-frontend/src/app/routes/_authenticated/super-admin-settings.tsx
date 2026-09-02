import { createFileRoute, redirect, Outlet } from '@tanstack/react-router';
import { MeResponseDtoSystemRole } from '@/shared/api/generated/ayunisCoreAPI.schemas';

function SuperAdminSettingsLayout() {
  return <Outlet />;
}

export const Route = createFileRoute('/_authenticated/super-admin-settings')({
  component: SuperAdminSettingsLayout,
  // Every super-admin sub-route flows through here, so the role check lives in
  // one place. Without it a non-super-admin's loader hits the API and the 403
  // surfaces as the generic "unexpected error" screen.
  beforeLoad: ({ context: { user } }) => {
    if (user.systemRole !== MeResponseDtoSystemRole.super_admin) {
      throw redirect({ to: '/' });
    }
  },
});
