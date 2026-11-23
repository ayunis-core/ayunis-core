import { createFileRoute } from '@tanstack/react-router';
import { ApiKeysSettingsPage } from '@/pages/admin-settings/api-keys-settings';
import {
  apiKeysControllerListApiKeys,
  creditLimitsControllerGetApiKeyLimits,
  getApiKeysControllerListApiKeysQueryKey,
  getCreditLimitsControllerGetApiKeyLimitsQueryKey,
  getSubscriptionsControllerHasActiveSubscriptionQueryKey,
  subscriptionsControllerHasActiveSubscription,
} from '@ayunis/api-client/endpoints';
import { ActiveSubscriptionResponseDtoSubscriptionType } from '@ayunis/api-client/schemas';

export const Route = createFileRoute('/_authenticated/admin-settings/api-keys')(
  {
    component: RouteComponent,
    loader: async ({ context: { queryClient } }) => {
      const [apiKeys, subscription] = await Promise.all([
        queryClient.query({
          queryKey: getApiKeysControllerListApiKeysQueryKey(),
          queryFn: () => apiKeysControllerListApiKeys(),
        }),
        queryClient.query({
          queryKey: getSubscriptionsControllerHasActiveSubscriptionQueryKey(),
          queryFn: () => subscriptionsControllerHasActiveSubscription(),
        }),
      ]);
      const creditLimits =
        subscription.subscriptionType ===
        ActiveSubscriptionResponseDtoSubscriptionType.USAGE_BASED
          ? await queryClient.query({
              queryKey: getCreditLimitsControllerGetApiKeyLimitsQueryKey(),
              queryFn: () => creditLimitsControllerGetApiKeyLimits(),
            })
          : [];
      return { apiKeys, creditLimits, subscription };
    },
  },
);

function RouteComponent() {
  const { apiKeys, creditLimits, subscription } = Route.useLoaderData();
  return (
    <ApiKeysSettingsPage
      apiKeys={apiKeys}
      creditLimits={creditLimits}
      subscription={subscription}
    />
  );
}
