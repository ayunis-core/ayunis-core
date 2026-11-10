import { createFileRoute } from '@tanstack/react-router';
import { NewsDetailPage } from '@/pages/news';
import {
  getModelsControllerIsEmbeddingModelEnabledQueryKey,
  modelsControllerIsEmbeddingModelEnabled,
} from '@/shared/api/generated/ayunisCoreAPI';
import {
  defaultModelSelectionQueryOptions,
  toComposerValue,
} from './-default-model-selection-query';

export const Route = createFileRoute('/_authenticated/news/$newsId')({
  component: RouteComponent,
  loader: async ({ context: { queryClient } }) => {
    const [defaultSelection, embedding] = await Promise.all([
      queryClient.query(defaultModelSelectionQueryOptions()).catch(() => null),
      queryClient
        .query({
          queryKey: getModelsControllerIsEmbeddingModelEnabledQueryKey(),
          queryFn: () => modelsControllerIsEmbeddingModelEnabled(),
        })
        .catch(() => null),
    ]);
    return {
      selectedModelId: toComposerValue(defaultSelection),
      isEmbeddingModelEnabled: embedding?.isEmbeddingModelEnabled ?? false,
    };
  },
});

function RouteComponent() {
  const { newsId } = Route.useParams();
  const { selectedModelId, isEmbeddingModelEnabled } = Route.useLoaderData();
  return (
    <NewsDetailPage
      key={newsId}
      newsId={newsId}
      selectedModelId={selectedModelId}
      isEmbeddingModelEnabled={isEmbeddingModelEnabled}
    />
  );
}
