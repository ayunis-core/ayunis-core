import { createFileRoute } from '@tanstack/react-router';
import { ApiKeysSettingsPage } from '@/pages/admin-settings/api-keys-settings';
import {
  apiKeysControllerListApiKeys,
  getApiKeysControllerListApiKeysQueryKey,
  getSubscriptionsControllerHasActiveSubscriptionQueryKey,
  subscriptionsControllerHasActiveSubscription,
} from '@/shared/api/generated/ayunisCoreAPI';

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
      return { apiKeys, subscription };
    },
  },
);

function RouteComponent() {
  const { apiKeys, subscription } = Route.useLoaderData();
  return <ApiKeysSettingsPage apiKeys={apiKeys} subscription={subscription} />;
}
