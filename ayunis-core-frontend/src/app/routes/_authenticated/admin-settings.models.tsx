import { createFileRoute } from '@tanstack/react-router';
import {
  getModelsControllerGetAvailableLanguageModelsQueryOptions,
  getModelsControllerGetAvailableEmbeddingModelsQueryOptions,
  getModelsControllerGetAvailableImageGenerationModelsQueryOptions,
} from '@/shared/api/generated/ayunisCoreAPI';
import ModelSettingsPage from '@/pages/admin-settings/model-settings';

export const Route = createFileRoute('/_authenticated/admin-settings/models')({
  component: RouteComponent,
  loader: async ({ context: { queryClient } }) => {
    await Promise.all([
      queryClient.fetchQuery(
        getModelsControllerGetAvailableLanguageModelsQueryOptions(),
      ),
      queryClient.fetchQuery(
        getModelsControllerGetAvailableEmbeddingModelsQueryOptions(),
      ),
      queryClient.fetchQuery(
        getModelsControllerGetAvailableImageGenerationModelsQueryOptions(),
      ),
    ]);
  },
});

function RouteComponent() {
  return <ModelSettingsPage />;
}
