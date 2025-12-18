import { createFileRoute } from '@tanstack/react-router';
import { getModelsControllerGetAvailableModelsWithConfigQueryOptions } from '@/shared/api/generated/ayunisCoreAPI';
import ModelSettingsPage from '@/pages/admin-settings/model-settings';

export const Route = createFileRoute('/_authenticated/admin-settings/models')({
  component: RouteComponent,
  loader: async ({ context: { queryClient } }) => {
    const modelsQueryOptions =
      getModelsControllerGetAvailableModelsWithConfigQueryOptions();
    await queryClient.fetchQuery(modelsQueryOptions);
  },
});

function RouteComponent() {
  return <ModelSettingsPage />;
}
