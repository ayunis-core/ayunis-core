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
} from '@/shared/api';
import SuperAdminSettingsOrgPage from '@/pages/super-admin-settings/org';
import { toSubscriptionHistoryItem } from '@/pages/super-admin-settings/org/lib/subscription-history';
import { z } from 'zod';

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
  usersSearch: z.string().optional(),
  usersPage: z.number().min(1).optional().catch(1),
  invitesSearch: z.string().optional(),
  invitesPage: z.number().min(1).optional().catch(1),
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
    deps: { usersSearch, usersPage = 1, invitesSearch, invitesPage = 1 },
  }) => {
    const offset = (usersPage - 1) * USERS_PER_PAGE;
    const invitesOffset = (invitesPage - 1) * INVITES_PER_PAGE;

    const org = await queryClient.fetchQuery({
      queryKey: getSuperAdminOrgsControllerGetOrgByIdQueryKey(id),
      queryFn: () => superAdminOrgsControllerGetOrgById(id),
    });
    const [usersResponse, invitesResponse] = await Promise.all([
      queryClient.fetchQuery({
        queryKey: getSuperAdminUsersControllerGetUsersByOrgIdQueryKey(id, {
          search: usersSearch,
          limit: USERS_PER_PAGE,
          offset,
        }),
        queryFn: () =>
          superAdminUsersControllerGetUsersByOrgId(id, {
            search: usersSearch,
            limit: USERS_PER_PAGE,
            offset,
          }),
      }),
      queryClient.fetchQuery({
        queryKey: getSuperAdminInvitesControllerGetInvitesQueryKey(id, {
          search: invitesSearch,
          limit: INVITES_PER_PAGE,
          offset: invitesOffset,
        }),
        queryFn: () =>
          superAdminInvitesControllerGetInvites(id, {
            search: invitesSearch,
            limit: INVITES_PER_PAGE,
            offset: invitesOffset,
          }),
      }),
    ]);
    const subscriptionResult = await queryClient.fetchQuery({
      queryKey: getSuperAdminSubscriptionsControllerGetSubscriptionQueryKey(id),
      queryFn: () => superAdminSubscriptionsControllerGetSubscription(id),
    });
    const subscriptionHistoryResult = await queryClient.fetchQuery({
      queryKey:
        getSuperAdminSubscriptionsControllerGetSubscriptionHistoryQueryKey(id),
      queryFn: () =>
        superAdminSubscriptionsControllerGetSubscriptionHistory(id),
    });
    const trialResult = await queryClient.fetchQuery({
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
