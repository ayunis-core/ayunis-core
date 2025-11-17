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

const searchSchema = z.object({
  tab: z.enum(['org', 'users', 'subscriptions', 'models', 'trials']).optional(),
});

export const Route = createFileRoute(
  '/_authenticated/super-admin-settings/orgs/$id',
)({
  validateSearch: searchSchema,
  component: RouteComponent,
  loader: async ({ context: { queryClient }, params: { id } }) => {
    const org = await queryClient.fetchQuery({
      queryKey: getSuperAdminOrgsControllerGetOrgByIdQueryKey(id),
      queryFn: () => superAdminOrgsControllerGetOrgById(id),
    });
    const users = await queryClient.fetchQuery({
      queryKey: getSuperAdminUsersControllerGetUsersByOrgIdQueryKey(id),
      queryFn: () => superAdminUsersControllerGetUsersByOrgId(id),
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
      users,
      subscriptionResult,
      trialResult,
    };
  },
});

function RouteComponent() {
  const data = Route.useLoaderData();
  const { tab } = Route.useSearch();
  return (
    <SuperAdminSettingsOrgPage
      org={data.org}
      users={data.users.users}
      subscription={data.subscriptionResult.subscription ?? null}
      trial={data.trialResult.trial ?? null}
      initialTab={tab}
    />
  );
}
