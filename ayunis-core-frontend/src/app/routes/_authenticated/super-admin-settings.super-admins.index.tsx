import { createFileRoute } from '@tanstack/react-router';
import SuperAdminSuperAdminsPage from '@/pages/super-admin-settings/super-admins';
import {
  getSuperAdminManagementControllerListSuperAdminsQueryKey,
  superAdminManagementControllerListSuperAdmins,
} from '@/shared/api';

export const Route = createFileRoute(
  '/_authenticated/super-admin-settings/super-admins/',
)({
  component: RouteComponent,
  loader: async ({ context: { queryClient } }) => {
    const superAdmins = await queryClient.fetchQuery({
      queryKey: getSuperAdminManagementControllerListSuperAdminsQueryKey(),
      queryFn: () => superAdminManagementControllerListSuperAdmins(),
    });
    return { superAdmins };
  },
});

function RouteComponent() {
  const { superAdmins } = Route.useLoaderData();
  return <SuperAdminSuperAdminsPage superAdmins={superAdmins} />;
}
