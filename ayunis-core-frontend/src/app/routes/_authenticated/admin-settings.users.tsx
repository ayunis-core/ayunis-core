import UsersSettingsPage from '@/pages/admin-settings/users-settings';
import { createFileRoute } from '@tanstack/react-router';
import { queryOptions } from '@tanstack/react-query';
import {
  getInvitesControllerGetInvitesQueryKey,
  invitesControllerGetInvites,
  getUserControllerGetUsersInOrganizationQueryKey,
  userControllerGetUsersInOrganization,
} from '@/shared/api/generated/ayunisCoreAPI';

const invitesQueryOptions = () =>
  queryOptions({
    queryKey: getInvitesControllerGetInvitesQueryKey(),
    queryFn: () => invitesControllerGetInvites(),
  });

const usersQueryOptions = () =>
  queryOptions({
    queryKey: getUserControllerGetUsersInOrganizationQueryKey(),
    queryFn: () => userControllerGetUsersInOrganization(),
  });

export const Route = createFileRoute('/_authenticated/admin-settings/users')({
  component: RouteComponent,
  loader: async ({ context: { queryClient } }) => {
    const [invites, users] = await Promise.all([
      queryClient.fetchQuery(invitesQueryOptions()),
      queryClient.fetchQuery(usersQueryOptions()),
    ]);
    return { invites, users };
  },
});

function RouteComponent() {
  const { invites, users } = Route.useLoaderData();
  return <UsersSettingsPage invites={invites} users={users.users} />;
}
