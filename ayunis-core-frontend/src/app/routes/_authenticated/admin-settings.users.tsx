import UsersSettingsPage from '@/pages/admin-settings/users-settings';
import { createFileRoute } from '@tanstack/react-router';
import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';
import {
  getInvitesControllerGetInvitesQueryKey,
  invitesControllerGetInvites,
  getUserControllerGetUsersInOrganizationQueryKey,
  userControllerGetUsersInOrganization,
} from '@/shared/api/generated/ayunisCoreAPI';

const USERS_PER_PAGE = 25;

const searchSchema = z.object({
  search: z.string().optional(),
  page: z.number().min(1).optional().catch(1),
});

const invitesQueryOptions = () =>
  queryOptions({
    queryKey: getInvitesControllerGetInvitesQueryKey(),
    queryFn: () => invitesControllerGetInvites(),
  });

export const Route = createFileRoute('/_authenticated/admin-settings/users')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  component: RouteComponent,
  loader: async ({ deps: { search, page = 1 }, context: { queryClient } }) => {
    const offset = (page - 1) * USERS_PER_PAGE;
    const [invites, usersResponse] = await Promise.all([
      queryClient.fetchQuery(invitesQueryOptions()),
      queryClient.fetchQuery({
        queryKey: getUserControllerGetUsersInOrganizationQueryKey({
          search,
          limit: USERS_PER_PAGE,
          offset,
        }),
        queryFn: () =>
          userControllerGetUsersInOrganization({
            search,
            limit: USERS_PER_PAGE,
            offset,
          }),
      }),
    ]);
    return {
      invites,
      usersResponse,
      search,
      page,
    };
  },
});

function RouteComponent() {
  const { invites, usersResponse, search, page } = Route.useLoaderData();
  return (
    <UsersSettingsPage
      invites={invites}
      users={usersResponse.data}
      pagination={usersResponse.pagination}
      search={search}
      currentPage={page ?? 1}
    />
  );
}
