import { anonymousModeDefaultQueryOptions } from '@/features/anonymous-mode-default';
import { createFileRoute } from '@tanstack/react-router';
import { NotificationPage } from '@/pages/notification';
import {
  getModelsControllerIsEmbeddingModelEnabledQueryKey,
  getNotificationsControllerFindOneQueryKey,
  modelsControllerIsEmbeddingModelEnabled,
  notificationsControllerFindOne,
} from '@/shared/api/generated/ayunisCoreAPI';
import {
  defaultModelSelectionQueryOptions,
  toComposerValue,
} from './-default-model-selection-query';

export const Route = createFileRoute('/_authenticated/inbox/$notificationId')({
  component: RouteComponent,
  loader: async ({ params: { notificationId }, context: { queryClient } }) => {
    const [notification, defaultSelection, embeddingModelResponse] =
      await Promise.all([
        queryClient.query({
          queryKey: getNotificationsControllerFindOneQueryKey(notificationId),
          queryFn: () => notificationsControllerFindOne(notificationId),
          // Deleting the routine clears the notification's routine link, which
          // decides whether Open routine is shown.
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
      notification,
      selectedModelId: toComposerValue(defaultSelection),
      isEmbeddingModelEnabled:
        embeddingModelResponse?.isEmbeddingModelEnabled ?? false,
    };
  },
});

function RouteComponent() {
  const { notification, selectedModelId, isEmbeddingModelEnabled } =
    Route.useLoaderData();
  return (
    <NotificationPage
      key={notification.id}
      notification={notification}
      selectedModelId={selectedModelId}
      isEmbeddingModelEnabled={isEmbeddingModelEnabled}
    />
  );
}
