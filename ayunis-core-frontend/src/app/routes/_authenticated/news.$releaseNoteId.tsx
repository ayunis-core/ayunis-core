import { createFileRoute, redirect } from '@tanstack/react-router';
import { anonymousModeDefaultQueryOptions } from '@/features/anonymous-mode-default';
import { ReleaseNotePage } from '@/pages/release-note';
import {
  getModelsControllerIsEmbeddingModelEnabledQueryKey,
  getReleaseNotesControllerFindOneQueryKey,
  modelsControllerIsEmbeddingModelEnabled,
  releaseNotesControllerFindOne,
} from '@/shared/api/generated/ayunisCoreAPI';
import {
  defaultModelSelectionQueryOptions,
  toComposerValue,
} from './-default-model-selection-query';
import { getFeatureToggles } from './-routines-enabled-query';

export const Route = createFileRoute('/_authenticated/news/$releaseNoteId')({
  component: RouteComponent,
  loader: async ({ params: { releaseNoteId }, context: { queryClient } }) => {
    const toggles = await getFeatureToggles(queryClient);
    if (!toggles.releaseNotesEnabled) {
      throw redirect({ to: '/chat' });
    }
    const [releaseNote, defaultSelection, embeddingModelResponse] =
      await Promise.all([
        queryClient.query({
          queryKey: getReleaseNotesControllerFindOneQueryKey(releaseNoteId),
          queryFn: () => releaseNotesControllerFindOne(releaseNoteId),
          staleTime: 0,
        }),
        queryClient
          .query(defaultModelSelectionQueryOptions())
          .catch(() => null),
        queryClient
          .query({
            queryKey: getModelsControllerIsEmbeddingModelEnabledQueryKey(),
            queryFn: () => modelsControllerIsEmbeddingModelEnabled(),
          })
          .catch(() => null),
        queryClient.query(anonymousModeDefaultQueryOptions()),
      ]);
    return {
      releaseNote,
      selectedModelId: toComposerValue(defaultSelection),
      isEmbeddingModelEnabled:
        embeddingModelResponse?.isEmbeddingModelEnabled ?? false,
    };
  },
});

function RouteComponent() {
  const { releaseNote, selectedModelId, isEmbeddingModelEnabled } =
    Route.useLoaderData();
  return (
    <ReleaseNotePage
      key={releaseNote.id}
      releaseNote={releaseNote}
      selectedModelId={selectedModelId}
      isEmbeddingModelEnabled={isEmbeddingModelEnabled}
    />
  );
}
