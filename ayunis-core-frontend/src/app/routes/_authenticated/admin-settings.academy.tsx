import { createFileRoute, redirect } from '@tanstack/react-router';
import { AcademySettingsPage } from '@/pages/admin-settings/academy-settings';
import { isAcademyAddonActive } from '@/features/academy';
import { createAuthorization } from '@/features/permissions';
import { MeResponseDtoRole } from '@/shared/api';
import {
  addonsControllerList,
  getAddonsControllerListQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';

export const Route = createFileRoute('/_authenticated/admin-settings/academy')({
  component: RouteComponent,
  beforeLoad: ({ context: { user } }) => {
    const authorization = createAuthorization(user.role);
    if (!authorization.hasRole(MeResponseDtoRole.admin)) {
      throw redirect({ to: '/' });
    }
  },
  // Without the add-on there is no certificate to require, so the setting has
  // no meaning — the sidebar hides the entry for the same reason.
  loader: async ({ context: { queryClient } }) => {
    const addons = await queryClient.fetchQuery({
      queryKey: getAddonsControllerListQueryKey(),
      queryFn: () => addonsControllerList(),
    });
    if (!isAcademyAddonActive(addons)) {
      throw redirect({ to: '/admin-settings/users' });
    }
  },
});

function RouteComponent() {
  return <AcademySettingsPage />;
}
