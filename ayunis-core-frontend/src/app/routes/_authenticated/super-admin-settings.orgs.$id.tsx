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
import extractErrorData from '@/shared/api/extract-error-data';
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
    const subscription = await queryClient
      .fetchQuery({
        queryKey:
          getSuperAdminSubscriptionsControllerGetSubscriptionQueryKey(id),
        queryFn: () => superAdminSubscriptionsControllerGetSubscription(id),
      })
      .catch((error) => {
        const { code } = extractErrorData(error);
        if (code === 'SUBSCRIPTION_NOT_FOUND') {
          return null;
        }
        throw error;
      });
    const trial = await queryClient
      .fetchQuery({
        queryKey: getSuperAdminTrialsControllerGetTrialByOrgIdQueryKey(id),
        queryFn: () => superAdminTrialsControllerGetTrialByOrgId(id),
      })
      .catch((error) => {
        const { code } = extractErrorData(error);
        if (code === 'TRIAL_NOT_FOUND') {
          return null;
        }
        throw error;
      });
    return {
      org,
      users,
      subscription,
      trial,
    };
  },
});

function RouteComponent() {
  const { org, users, subscription, trial } = Route.useLoaderData();
  const { tab } = Route.useSearch();
  return (
    <SuperAdminSettingsOrgPage
      org={org}
      users={users.users}
      subscription={subscription}
      trial={trial}
      initialTab={tab}
    />
  );
}
