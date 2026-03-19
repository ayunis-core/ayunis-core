import { createFileRoute, redirect } from '@tanstack/react-router';
import {
  getUsageControllerGetUsageConfigQueryOptions,
  subscriptionsControllerHasActiveSubscription,
} from '@/shared/api/generated/ayunisCoreAPI';
import { ActiveSubscriptionResponseDtoSubscriptionType } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import UsageSettingsPage from '@/pages/admin-settings/usage-settings';

export const Route = createFileRoute('/_authenticated/admin-settings/usage')({
  component: RouteComponent,
  beforeLoad: async () => {
    const { subscriptionType } =
      await subscriptionsControllerHasActiveSubscription();
    if (
      subscriptionType !==
      ActiveSubscriptionResponseDtoSubscriptionType.USAGE_BASED
    ) {
      throw redirect({ to: '/admin-settings/users' });
    }
  },
  loader: async ({ context: { queryClient } }) => {
    const usageConfigQueryOptions =
      getUsageControllerGetUsageConfigQueryOptions();
    await queryClient.fetchQuery(usageConfigQueryOptions);
  },
});

function RouteComponent() {
  return <UsageSettingsPage />;
}
