import { createFileRoute, redirect } from '@tanstack/react-router';
import { WorkspacePage } from '@/pages/workspace';
import {
  workspacesControllerFindOne,
  getWorkspacesControllerFindOneQueryKey,
  threadsControllerFindAll,
  getThreadsControllerFindAllQueryKey,
  appControllerFeatureToggles,
  getAppControllerFeatureTogglesQueryKey,
  modelsDefaultsControllerGetEffectiveDefaultModel,
  getModelsDefaultsControllerGetEffectiveDefaultModelQueryKey,
  modelsControllerIsEmbeddingModelEnabled,
  getModelsControllerIsEmbeddingModelEnabledQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';

const WORKSPACE_CHATS_LIMIT = 100;

const queryDefaultModelOptions = () => ({
  queryKey: getModelsDefaultsControllerGetEffectiveDefaultModelQueryKey(),
  queryFn: () => modelsDefaultsControllerGetEffectiveDefaultModel(),
});

const queryIsEmbeddingModelEnabledOptions = () => ({
  queryKey: getModelsControllerIsEmbeddingModelEnabledQueryKey(),
  queryFn: () => modelsControllerIsEmbeddingModelEnabled(),
});

export const Route = createFileRoute('/_authenticated/workspaces/$workspaceId')(
  {
    component: RouteComponent,
    loader: async ({ params: { workspaceId }, context: { queryClient } }) => {
      const featureToggles = await queryClient.fetchQuery({
        queryKey: getAppControllerFeatureTogglesQueryKey(),
        queryFn: () => appControllerFeatureToggles(),
      });
      if (!featureToggles.workspacesEnabled) {
        throw redirect({ to: '/chat' });
      }

      const chatsParams = {
        workspaceId,
        limit: WORKSPACE_CHATS_LIMIT,
        offset: 0,
      };

      // Only a missing workspace should redirect. A transient failure loading
      // the chats must not look like "this workspace does not exist".
      const workspace = await queryClient
        .fetchQuery({
          queryKey: getWorkspacesControllerFindOneQueryKey(workspaceId),
          queryFn: () => workspacesControllerFindOne(workspaceId),
        })
        .catch(() => {
          throw redirect({ to: '/workspaces' });
        });

      const chats = await queryClient.fetchQuery({
        queryKey: getThreadsControllerFindAllQueryKey(chatsParams),
        queryFn: () => threadsControllerFindAll(chatsParams),
      });

      // The model queries only serve the embedded composer; a failure must
      // not take down the whole workspace page (chats and settings work
      // without them). Without a model the composer rejects sending with a
      // toast, matching the new-chat page's no-model behavior.
      const [defaultModelResponse, embeddingModelResponse] = await Promise.all([
        queryClient.fetchQuery(queryDefaultModelOptions()).catch(() => null),
        queryClient
          .fetchQuery(queryIsEmbeddingModelEnabledOptions())
          .catch(() => null),
      ]);

      return {
        workspace,
        chats: chats.data,
        // The list is capped, so the badge must use the server's total rather
        // than the number of rows that happened to fit in one page.
        // `total` is optional in the generated DTO; fall back to what loaded.
        chatCount: chats.pagination.total ?? chats.data.length,
        selectedModelId: defaultModelResponse?.permittedLanguageModel?.id,
        isEmbeddingModelEnabled:
          embeddingModelResponse?.isEmbeddingModelEnabled ?? false,
      };
    },
  },
);

function RouteComponent() {
  const {
    workspace,
    chats,
    chatCount,
    selectedModelId,
    isEmbeddingModelEnabled,
  } = Route.useLoaderData();
  return (
    <WorkspacePage
      workspace={workspace}
      chats={chats}
      chatCount={chatCount}
      selectedModelId={selectedModelId}
      isEmbeddingModelEnabled={isEmbeddingModelEnabled}
    />
  );
}
