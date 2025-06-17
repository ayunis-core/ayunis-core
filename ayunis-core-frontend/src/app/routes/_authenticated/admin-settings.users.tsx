import UsersSettingsPage from "@/pages/admin-settings/users-settings";
import { createFileRoute } from "@tanstack/react-router";
import { queryOptions } from "@tanstack/react-query";
import {
  invitesControllerGetInvites,
  userControllerGetUsersInOrganization,
} from "@/shared/api/generated/ayunisCoreAPI";

const invitesQueryOptions = () =>
  queryOptions({
    queryKey: ["invites"],
    queryFn: () => invitesControllerGetInvites(),
  });

const usersQueryOptions = () =>
  queryOptions({
    queryKey: ["users"],
    queryFn: () => userControllerGetUsersInOrganization(),
  });

export const Route = createFileRoute("/_authenticated/admin-settings/users")({
  component: RouteComponent,
  loader: async ({ context: { queryClient } }) => {
    const [invites, users] = await Promise.all([
      queryClient.ensureQueryData(invitesQueryOptions()),
      queryClient.ensureQueryData(usersQueryOptions()),
    ]);
    return { invites, users };
  },
});

function RouteComponent() {
  const { invites, users } = Route.useLoaderData();
  return <UsersSettingsPage invites={invites} users={users.users} />;
}
