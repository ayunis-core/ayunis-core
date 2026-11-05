import UsersSettingsPage from '@/pages/admin-settings/users-settings';
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import {
  getInvitesControllerGetInvitesQueryKey,
  invitesControllerGetInvites,
  getUserControllerGetUsersInOrganizationQueryKey,
  userControllerGetUsersInOrganization,
} from '@/shared/api/generated/ayunisCoreAPI';
import { InvitesSortField, OrgUsersSortField } from '@/shared/api';
import { sortFieldSchema, sortOrderSchema } from '@/shared/lib/table-sort';
import { searchParamString } from '@/shared/lib/search-params';

const USERS_PER_PAGE = 25;
const INVITES_PER_PAGE = 10;

const searchSchema = z.object({
  search: searchParamString.optional(),
  page: z.number().min(1).optional().catch(1),
  invitesSearch: searchParamString.optional(),
  invitesPage: z.number().min(1).optional().catch(1),
  sortBy: sortFieldSchema(OrgUsersSortField),
  sortOrder: sortOrderSchema,
  invitesSortBy: sortFieldSchema(InvitesSortField),
  invitesSortOrder: sortOrderSchema,
});

export const Route = createFileRoute('/_authenticated/admin-settings/users')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  component: RouteComponent,
  loader: async ({
    deps: {
      search,
      page = 1,
      invitesSearch,
      invitesPage = 1,
      sortBy,
      sortOrder,
      invitesSortBy,
      invitesSortOrder,
    },
    context: { queryClient },
  }) => {
    const usersParams = {
      search,
      sortBy,
      sortOrder,
      limit: USERS_PER_PAGE,
      offset: (page - 1) * USERS_PER_PAGE,
    };
    const invitesParams = {
      search: invitesSearch,
      sortBy: invitesSortBy,
      sortOrder: invitesSortOrder,
      limit: INVITES_PER_PAGE,
      offset: (invitesPage - 1) * INVITES_PER_PAGE,
    };

    const [invitesResponse, usersResponse] = await Promise.all([
      queryClient.query({
        queryKey: getInvitesControllerGetInvitesQueryKey(invitesParams),
        queryFn: () => invitesControllerGetInvites(invitesParams),
      }),
      queryClient.query({
        queryKey: getUserControllerGetUsersInOrganizationQueryKey(usersParams),
        queryFn: () => userControllerGetUsersInOrganization(usersParams),
      }),
    ]);
    return {
      invitesResponse,
      usersResponse,
      search,
      page,
      invitesSearch,
      invitesPage,
      usersSort: { sortBy, sortOrder },
      invitesSort: { sortBy: invitesSortBy, sortOrder: invitesSortOrder },
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
    usersSort,
    invitesSort,
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
      usersSort={usersSort}
      invitesSort={invitesSort}
    />
  );
}
