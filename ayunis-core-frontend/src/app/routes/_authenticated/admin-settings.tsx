import { createFileRoute, redirect, Outlet } from '@tanstack/react-router';
import { getMyPermissionsControllerGetMineQueryOptions } from '@/shared/api';
import { allowedSettingsSections } from '@/features/permissions';

function AdminSettingsLayout() {
  return <Outlet />;
}

export const Route = createFileRoute('/_authenticated/admin-settings')({
  component: AdminSettingsLayout,
  // Admins reach every section. Non-admins reach only the sections their role
  // permissions grant (Teams today); anything else redirects. Every settings
  // sub-route flows through here, so admin-only screens stay admin-only.
  beforeLoad: async ({ context: { user, queryClient }, location }) => {
    const { permissions } = await queryClient.fetchQuery(
      getMyPermissionsControllerGetMineQueryOptions(),
    );
    const allowed = allowedSettingsSections(user.role, permissions);

    if (allowed.some((path) => location.pathname.startsWith(path))) {
      return;
    }

    if (allowed.length > 0) {
      throw redirect({ to: allowed[0] });
    }
    throw redirect({ to: '/' });
  },
});
