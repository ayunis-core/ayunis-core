import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';
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

const WORKSPACE_CHATS_LIMIT = 20;

const searchSchema = z.object({
  search: z.string().optional(),
  page: z.number().min(1).optional().catch(1),
});

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
    validateSearch: searchSchema,
    loaderDeps: ({ search }) => search,
    component: RouteComponent,
    loader: async ({
      params: { workspaceId },
      deps: { search, page = 1 },
      context: { queryClient },
    }) => {
      const featureToggles = await queryClient.fetchQuery({
        queryKey: getAppControllerFeatureTogglesQueryKey(),
        queryFn: () => appControllerFeatureToggles(),
      });
      if (!featureToggles.workspacesEnabled) {
        throw redirect({ to: '/chat' });
      }

      const chatsParams = {
        workspaceId,
        search: search || undefined,
        limit: WORKSPACE_CHATS_LIMIT,
        offset: (page - 1) * WORKSPACE_CHATS_LIMIT,
      };

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

      const [defaultModelResponse, embeddingModelResponse] = await Promise.all([
        queryClient.fetchQuery(queryDefaultModelOptions()).catch(() => null),
        queryClient
          .fetchQuery(queryIsEmbeddingModelEnabledOptions())
          .catch(() => null),
      ]);

      return {
        workspace,
        chats: chats.data,
        chatCount: chats.pagination.total ?? chats.data.length,
        chatPagination: chats.pagination,
        chatSearch: search,
        chatPage: page,
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
    chatPagination,
    chatSearch,
    chatPage,
    selectedModelId,
    isEmbeddingModelEnabled,
  } = Route.useLoaderData();
  return (
    <WorkspacePage
      key={workspace.id}
      workspace={workspace}
      chats={chats}
      chatCount={chatCount}
      chatPagination={chatPagination}
      chatSearch={chatSearch}
      chatPage={chatPage}
      selectedModelId={selectedModelId}
      isEmbeddingModelEnabled={isEmbeddingModelEnabled}
    />
  );
}
