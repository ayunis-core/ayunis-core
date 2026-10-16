import { createFileRoute, redirect, Outlet } from '@tanstack/react-router';
import {
  getMyPermissionsControllerGetMineQueryOptions,
  getTeamsControllerListMyTeamsQueryOptions,
} from '@/shared/api';
import {
  allowedSettingsSections,
  createAuthorization,
} from '@/features/permissions';

function AdminSettingsLayout() {
  return <Outlet />;
}

export const Route = createFileRoute('/_authenticated/admin-settings')({
  component: AdminSettingsLayout,
  // Admins reach every section. Non-admins reach only the sections their role
  // permissions or team admin roles grant (Teams today); anything else
  // redirects. Every settings sub-route flows through here, so admin-only
  // screens stay admin-only.
  beforeLoad: async ({ context: { user, queryClient }, location }) => {
    const [{ permissions, teamAdminPermissions }, myTeams] = await Promise.all([
      queryClient.query(getMyPermissionsControllerGetMineQueryOptions()),
      queryClient.query(getTeamsControllerListMyTeamsQueryOptions()),
    ]);
    const teamAdminTeamIds = myTeams
      .filter((team) => team.isTeamAdmin)
      .map((team) => team.id);
    const authorization = createAuthorization(user.role, permissions, {
      teamIds: teamAdminTeamIds,
      permissions: teamAdminPermissions,
    });
    const allowed = allowedSettingsSections(authorization);

    if (allowed.some((path) => location.pathname.startsWith(path))) {
      return;
    }

    if (allowed.length > 0) {
      throw redirect({ to: allowed[0] });
    }
    throw redirect({ to: '/' });
  },
});
