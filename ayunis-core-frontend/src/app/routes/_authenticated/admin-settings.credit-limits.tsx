import { createFileRoute, redirect } from '@tanstack/react-router';
import { CreditLimitsSettingsPage } from '@/pages/admin-settings/credit-limits-settings';
import {
  creditLimitsControllerGetOverview,
  getCreditLimitsControllerGetOverviewQueryKey,
  subscriptionsControllerHasActiveSubscription,
  getSubscriptionsControllerHasActiveSubscriptionQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';

export const Route = createFileRoute(
  '/_authenticated/admin-settings/credit-limits',
)({
  component: RouteComponent,
  beforeLoad: ({ context: { user } }) => {
    if (user.role !== 'admin') {
      throw redirect({ to: '/' });
    }
  },
  loader: async ({ context: { queryClient } }) => {
    const subscription = await queryClient.fetchQuery({
      queryKey: getSubscriptionsControllerHasActiveSubscriptionQueryKey(),
      queryFn: () => subscriptionsControllerHasActiveSubscription(),
    });
    // Credit limits only apply to usage-based subscriptions.
    if (subscription.subscriptionType !== 'USAGE_BASED') {
      throw redirect({ to: '/admin-settings/users' });
    }

    const overview = await queryClient.fetchQuery({
      queryKey: getCreditLimitsControllerGetOverviewQueryKey(),
      queryFn: () => creditLimitsControllerGetOverview(),
    });
    return { overview };
  },
});

function RouteComponent() {
  const { overview } = Route.useLoaderData();
  return <CreditLimitsSettingsPage overview={overview} />;
}
