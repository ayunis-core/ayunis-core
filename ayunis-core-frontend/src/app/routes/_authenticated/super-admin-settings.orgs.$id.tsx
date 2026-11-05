import { createFileRoute } from '@tanstack/react-router';
import {
  superAdminOrgsControllerGetOrgById,
  getSuperAdminOrgsControllerGetOrgByIdQueryKey,
  superAdminSubscriptionsControllerGetSubscription,
  getSuperAdminSubscriptionsControllerGetSubscriptionQueryKey,
  superAdminSubscriptionsControllerGetSubscriptionHistory,
  getSuperAdminSubscriptionsControllerGetSubscriptionHistoryQueryKey,
  superAdminUsersControllerGetUsersByOrgId,
  getSuperAdminUsersControllerGetUsersByOrgIdQueryKey,
  superAdminInvitesControllerGetInvites,
  getSuperAdminInvitesControllerGetInvitesQueryKey,
  superAdminTrialsControllerGetTrialByOrgId,
  getSuperAdminTrialsControllerGetTrialByOrgIdQueryKey,
  InvitesSortField,
  OrgUsersSortField,
} from '@/shared/api';
import { sortFieldSchema, sortOrderSchema } from '@/shared/lib/table-sort';
import SuperAdminSettingsOrgPage from '@/pages/super-admin-settings/org';
import { toSubscriptionHistoryItem } from '@/pages/super-admin-settings/org/lib/subscription-history';
import { z } from 'zod';
import { searchParamString } from '@/shared/lib/search-params';

const USERS_PER_PAGE = 25;
const INVITES_PER_PAGE = 10;

const searchSchema = z.object({
  tab: z
    .enum([
      'org',
      'users',
      'subscriptions',
      'models',
      'trials',
      'usage',
      'crawl-domains',
      'addons',
      'sso',
    ])
    .optional(),
  usersSearch: searchParamString.optional(),
  usersPage: z.number().min(1).optional().catch(1),
  invitesSearch: searchParamString.optional(),
  invitesPage: z.number().min(1).optional().catch(1),
  usersSortBy: sortFieldSchema(OrgUsersSortField),
  usersSortOrder: sortOrderSchema,
  invitesSortBy: sortFieldSchema(InvitesSortField),
  invitesSortOrder: sortOrderSchema,
});

export const Route = createFileRoute(
  '/_authenticated/super-admin-settings/orgs/$id',
)({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  component: RouteComponent,
  loader: async ({
    context: { queryClient },
    params: { id },
    deps: {
      usersSearch,
      usersPage = 1,
      invitesSearch,
      invitesPage = 1,
      usersSortBy,
      usersSortOrder,
      invitesSortBy,
      invitesSortOrder,
    },
  }) => {
    const usersParams = {
      search: usersSearch,
      sortBy: usersSortBy,
      sortOrder: usersSortOrder,
      limit: USERS_PER_PAGE,
      offset: (usersPage - 1) * USERS_PER_PAGE,
    };
    const invitesParams = {
      search: invitesSearch,
      sortBy: invitesSortBy,
      sortOrder: invitesSortOrder,
      limit: INVITES_PER_PAGE,
      offset: (invitesPage - 1) * INVITES_PER_PAGE,
    };

    const org = await queryClient.query({
      queryKey: getSuperAdminOrgsControllerGetOrgByIdQueryKey(id),
      queryFn: () => superAdminOrgsControllerGetOrgById(id),
    });
    const [usersResponse, invitesResponse] = await Promise.all([
      queryClient.query({
        queryKey: getSuperAdminUsersControllerGetUsersByOrgIdQueryKey(
          id,
          usersParams,
        ),
        queryFn: () =>
          superAdminUsersControllerGetUsersByOrgId(id, usersParams),
      }),
      queryClient.query({
        queryKey: getSuperAdminInvitesControllerGetInvitesQueryKey(
          id,
          invitesParams,
        ),
        queryFn: () => superAdminInvitesControllerGetInvites(id, invitesParams),
      }),
    ]);
    const subscriptionResult = await queryClient.query({
      queryKey: getSuperAdminSubscriptionsControllerGetSubscriptionQueryKey(id),
      queryFn: () => superAdminSubscriptionsControllerGetSubscription(id),
    });
    const subscriptionHistoryResult = await queryClient.query({
      queryKey:
        getSuperAdminSubscriptionsControllerGetSubscriptionHistoryQueryKey(id),
      queryFn: () =>
        superAdminSubscriptionsControllerGetSubscriptionHistory(id),
    });
    const trialResult = await queryClient.query({
      queryKey: getSuperAdminTrialsControllerGetTrialByOrgIdQueryKey(id),
      queryFn: () => superAdminTrialsControllerGetTrialByOrgId(id),
    });
    return {
      org,
      usersResponse,
      invitesResponse,
      subscriptionResult,
      subscriptionHistoryResult,
      trialResult,
      usersSearch,
      usersPage,
      invitesSearch,
      invitesPage,
      usersSort: { sortBy: usersSortBy, sortOrder: usersSortOrder },
      invitesSort: { sortBy: invitesSortBy, sortOrder: invitesSortOrder },
    };
  },
});

function RouteComponent() {
  const data = Route.useLoaderData();
  const { tab } = Route.useSearch();
  return (
    <SuperAdminSettingsOrgPage
      org={data.org}
      users={data.usersResponse.data}
      usersPagination={data.usersResponse.pagination}
      usersSearch={data.usersSearch}
      usersCurrentPage={data.usersPage}
      invites={data.invitesResponse.data}
      invitesPagination={data.invitesResponse.pagination}
      invitesSearch={data.invitesSearch}
      invitesCurrentPage={data.invitesPage}
      usersSort={data.usersSort}
      invitesSort={data.invitesSort}
      subscription={data.subscriptionResult.subscription ?? null}
      subscriptionHistory={data.subscriptionHistoryResult.subscriptions.map(
        toSubscriptionHistoryItem,
      )}
      activeSubscriptionCount={data.subscriptionHistoryResult.activeCount}
      trial={data.trialResult.trial ?? null}
      initialTab={tab}
    />
  );
}
