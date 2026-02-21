import UsersSettingsPage from '@/pages/admin-settings/users-settings';
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import {
  getInvitesControllerGetInvitesQueryKey,
  invitesControllerGetInvites,
  getUserControllerGetUsersInOrganizationQueryKey,
  userControllerGetUsersInOrganization,
} from '@/shared/api/generated/ayunisCoreAPI';

const USERS_PER_PAGE = 25;
const INVITES_PER_PAGE = 10;

const searchSchema = z.object({
  search: z.string().optional(),
  page: z.number().min(1).optional().catch(1),
  invitesSearch: z.string().optional(),
  invitesPage: z.number().min(1).optional().catch(1),
});

export const Route = createFileRoute('/_authenticated/admin-settings/users')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  component: RouteComponent,
  loader: async ({
    deps: { search, page = 1, invitesSearch, invitesPage = 1 },
    context: { queryClient },
  }) => {
    const offset = (page - 1) * USERS_PER_PAGE;
    const invitesOffset = (invitesPage - 1) * INVITES_PER_PAGE;

    const [invitesResponse, usersResponse] = await Promise.all([
      queryClient.fetchQuery({
        queryKey: getInvitesControllerGetInvitesQueryKey({
          search: invitesSearch,
          limit: INVITES_PER_PAGE,
          offset: invitesOffset,
        }),
        queryFn: () =>
          invitesControllerGetInvites({
            search: invitesSearch,
            limit: INVITES_PER_PAGE,
            offset: invitesOffset,
          }),
      }),
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
      invitesResponse,
      usersResponse,
      search,
      page,
      invitesSearch,
      invitesPage,
    };
  },
});

function RouteComponent() {
  const {
    invitesResponse,
    usersResponse,
    search,
    page,
    invitesSearch,
    invitesPage,
  } = Route.useLoaderData();
  return (
    <UsersSettingsPage
      invites={invitesResponse.data}
      invitesPagination={invitesResponse.pagination}
      invitesSearch={invitesSearch}
      invitesCurrentPage={invitesPage}
      users={usersResponse.data}
      pagination={usersResponse.pagination}
      search={search}
      currentPage={page}
    />
  );
}
