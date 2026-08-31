import { createFileRoute } from '@tanstack/react-router';
import { ApiKeysSettingsPage } from '@/pages/admin-settings/api-keys-settings';
import {
  apiKeysControllerListApiKeys,
  creditLimitsControllerGetApiKeyLimits,
  getApiKeysControllerListApiKeysQueryKey,
  getCreditLimitsControllerGetApiKeyLimitsQueryKey,
  getSubscriptionsControllerHasActiveSubscriptionQueryKey,
  subscriptionsControllerHasActiveSubscription,
} from '@/shared/api/generated/ayunisCoreAPI';
import { ActiveSubscriptionResponseDtoSubscriptionType } from '@/shared/api/generated/ayunisCoreAPI.schemas';

export const Route = createFileRoute('/_authenticated/admin-settings/api-keys')(
  {
    component: RouteComponent,
    loader: async ({ context: { queryClient } }) => {
      const [apiKeys, subscription] = await Promise.all([
        queryClient.fetchQuery({
          queryKey: getApiKeysControllerListApiKeysQueryKey(),
          queryFn: () => apiKeysControllerListApiKeys(),
        }),
        queryClient.fetchQuery({
          queryKey: getSubscriptionsControllerHasActiveSubscriptionQueryKey(),
          queryFn: () => subscriptionsControllerHasActiveSubscription(),
        }),
      ]);
      const creditLimits =
        subscription.subscriptionType ===
        ActiveSubscriptionResponseDtoSubscriptionType.USAGE_BASED
          ? await queryClient.fetchQuery({
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
