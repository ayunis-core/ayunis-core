import { createFileRoute } from '@tanstack/react-router';
import { ApiKeysSettingsPage } from '@/pages/admin-settings/api-keys-settings';
import {
  apiKeysControllerListApiKeys,
  getApiKeysControllerListApiKeysQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';

export const Route = createFileRoute('/_authenticated/admin-settings/api-keys')(
  {
    component: RouteComponent,
    loader: async ({ context: { queryClient } }) => {
      const apiKeys = await queryClient.fetchQuery({
        queryKey: getApiKeysControllerListApiKeysQueryKey(),
        queryFn: () => apiKeysControllerListApiKeys(),
      });
      return { apiKeys };
    },
  },
);

function RouteComponent() {
  const { apiKeys } = Route.useLoaderData();
  return <ApiKeysSettingsPage apiKeys={apiKeys} />;
}
