import { createFileRoute } from '@tanstack/react-router';
import {
  getModelsControllerGetAvailableLanguageModelsQueryOptions,
  getModelsControllerGetAvailableEmbeddingModelsQueryOptions,
  getModelsControllerGetAvailableImageGenerationModelsQueryOptions,
} from '@/shared/api/generated/ayunisCoreAPI';
import ModelSettingsPage from '@/pages/admin-settings/model-settings';
import { modelSettingsSearchSchema } from '@/pages/admin-settings/model-settings/model/search';

export const Route = createFileRoute('/_authenticated/admin-settings/models/')({
  component: RouteComponent,
  validateSearch: modelSettingsSearchSchema,
  loaderDeps: ({ search: { tab } }) => ({ tab }),
  loader: async ({ context: { queryClient }, deps: { tab } }) => {
    if (tab === 'teams') return;
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
  const { tab, search } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <ModelSettingsPage
      tab={tab}
      search={search}
      onSearchChange={(value) => {
        void navigate({ search: { tab, search: value }, replace: true });
      }}
    />
  );
}
