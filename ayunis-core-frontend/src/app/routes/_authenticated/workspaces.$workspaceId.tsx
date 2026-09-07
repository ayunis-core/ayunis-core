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
  modelsControllerIsEmbeddingModelEnabled,
  getModelsControllerIsEmbeddingModelEnabledQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import { effectiveDefaultModelQueryOptions } from './-effective-default-model-query';

const WORKSPACE_CHATS_LIMIT = 20;

const searchSchema = z.object({
  search: z.string().optional(),
  page: z.number().min(1).optional().catch(1),
  tab: z
    .enum(['chats', 'artifacts', 'skills', 'knowledge', 'instructions'])
    .optional()
    .catch('chats'),
});

const queryIsEmbeddingModelEnabledOptions = () => ({
  queryKey: getModelsControllerIsEmbeddingModelEnabledQueryKey(),
  queryFn: () => modelsControllerIsEmbeddingModelEnabled(),
});

export const Route = createFileRoute('/_authenticated/workspaces/$workspaceId')(
  {
    validateSearch: searchSchema,
    loaderDeps: ({ search: { search, page } }) => ({ search, page }),
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
        queryClient
          .fetchQuery(effectiveDefaultModelQueryOptions())
          .catch(() => null),
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
  const { tab = 'chats' } = Route.useSearch();
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
      activeTab={tab}
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
