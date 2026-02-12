import { createFileRoute } from '@tanstack/react-router';
import {
  superAdminOrgsControllerGetOrgById,
  getSuperAdminOrgsControllerGetOrgByIdQueryKey,
  superAdminSubscriptionsControllerGetSubscription,
  getSuperAdminSubscriptionsControllerGetSubscriptionQueryKey,
  superAdminUsersControllerGetUsersByOrgId,
  getSuperAdminUsersControllerGetUsersByOrgIdQueryKey,
  superAdminTrialsControllerGetTrialByOrgId,
  getSuperAdminTrialsControllerGetTrialByOrgIdQueryKey,
} from '@/shared/api';
import SuperAdminSettingsOrgPage from '@/pages/super-admin-settings/org';
import { z } from 'zod';

const USERS_PER_PAGE = 25;

const searchSchema = z.object({
  tab: z
    .enum(['org', 'users', 'subscriptions', 'models', 'trials', 'usage'])
    .optional(),
  usersSearch: z.string().optional(),
  usersPage: z.number().min(1).optional().catch(1),
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
    deps: { usersSearch, usersPage = 1 },
  }) => {
    const offset = (usersPage - 1) * USERS_PER_PAGE;

    const org = await queryClient.fetchQuery({
      queryKey: getSuperAdminOrgsControllerGetOrgByIdQueryKey(id),
      queryFn: () => superAdminOrgsControllerGetOrgById(id),
    });
    const usersResponse = await queryClient.fetchQuery({
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
    });
    const subscriptionResult = await queryClient.fetchQuery({
      queryKey: getSuperAdminSubscriptionsControllerGetSubscriptionQueryKey(id),
      queryFn: () => superAdminSubscriptionsControllerGetSubscription(id),
    });
    const trialResult = await queryClient.fetchQuery({
      queryKey: getSuperAdminTrialsControllerGetTrialByOrgIdQueryKey(id),
      queryFn: () => superAdminTrialsControllerGetTrialByOrgId(id),
    });
    return {
      org,
      usersResponse,
      subscriptionResult,
      trialResult,
      usersSearch,
      usersPage,
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
      usersCurrentPage={data.usersPage ?? 1}
      subscription={data.subscriptionResult.subscription ?? null}
      trial={data.trialResult.trial ?? null}
      initialTab={tab}
    />
  );
}
