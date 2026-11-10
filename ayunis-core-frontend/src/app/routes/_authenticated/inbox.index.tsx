import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';
import { InboxPage, notificationsPageParams } from '@/pages/inbox';
import {
  getNotificationsControllerFindAllQueryKey,
  notificationsControllerFindAll,
} from '@/shared/api/generated/ayunisCoreAPI';
import { NotificationType } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { getFeatureToggles } from './-routines-enabled-query';
import {
  defaultModelSelectionQueryOptions,
  toComposerValue,
} from './-default-model-selection-query';
import {
  getModelsControllerIsEmbeddingModelEnabledQueryKey,
  modelsControllerIsEmbeddingModelEnabled,
} from '@/shared/api/generated/ayunisCoreAPI';

const searchSchema = z.object({
  page: z.number().min(1).optional().catch(1),
  type: z.enum(NotificationType).optional().catch(undefined),
  selected: z.string().optional().catch(undefined),
});

export const Route = createFileRoute('/_authenticated/inbox/')({
  validateSearch: searchSchema,
  loaderDeps: ({ search: { page, type } }) => ({ page, type }),
  component: RouteComponent,
  loader: async ({ deps: { page = 1, type }, context: { queryClient } }) => {
    const toggles = await getFeatureToggles(queryClient);
    if (!toggles.routinesEnabled) {
      throw redirect({ to: '/chat' });
    }
    if (
      type === NotificationType.release_note &&
      !toggles.releaseNotesEnabled
    ) {
      throw redirect({ to: '/inbox' });
    }
    const params = notificationsPageParams(page, type);
    const [, defaultSelection, embedding] = await Promise.all([
      queryClient.query({
        queryKey: getNotificationsControllerFindAllQueryKey(params),
        queryFn: () => notificationsControllerFindAll(params),
      }),
      queryClient.query(defaultModelSelectionQueryOptions()).catch(() => null),
      queryClient
        .query({
          queryKey: getModelsControllerIsEmbeddingModelEnabledQueryKey(),
          queryFn: () => modelsControllerIsEmbeddingModelEnabled(),
        })
        .catch(() => null),
    ]);
    return {
      page,
      type,
      selectedModelId: toComposerValue(defaultSelection),
      isEmbeddingModelEnabled: embedding?.isEmbeddingModelEnabled ?? false,
    };
  },
});

function RouteComponent() {
  const { page, type, selectedModelId, isEmbeddingModelEnabled } =
    Route.useLoaderData();
  const { selected } = Route.useSearch();
  return (
    <InboxPage
      page={page}
      type={type}
      selectedId={selected}
      selectedModelId={selectedModelId}
      isEmbeddingModelEnabled={isEmbeddingModelEnabled}
    />
  );
}
