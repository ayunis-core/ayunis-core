import { anonymousModeDefaultQueryOptions } from '@/features/anonymous-mode-default';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';
import { WorkspaceNoAccessPage, WorkspacePage } from '@/pages/workspace';
import extractErrorData from '@/shared/api/extract-error-data';
import {
  workspacesControllerFindOne,
  getWorkspacesControllerFindOneQueryKey,
  threadsControllerFindAll,
  getThreadsControllerFindAllQueryKey,
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
      await queryClient.query(anonymousModeDefaultQueryOptions());
      const chatsParams = {
        workspaceId,
        search: search || undefined,
        limit: WORKSPACE_CHATS_LIMIT,
        offset: (page - 1) * WORKSPACE_CHATS_LIMIT,
      };

      const workspace = await queryClient
        .query({
          queryKey: getWorkspacesControllerFindOneQueryKey(workspaceId),
          queryFn: () => workspacesControllerFindOne(workspaceId),
        })
        .catch((error: unknown) => {
          if (isNotFound(error)) return null;
          throw redirect({ to: '/workspaces' });
        });
      if (!workspace) return { noAccess: true as const };

      const chats = await queryClient.query({
        queryKey: getThreadsControllerFindAllQueryKey(chatsParams),
        queryFn: () => threadsControllerFindAll(chatsParams),
      });

      const [defaultModelResponse, embeddingModelResponse] = await Promise.all([
        queryClient
          .query(effectiveDefaultModelQueryOptions())
          .catch(() => null),
        queryClient
          .query(queryIsEmbeddingModelEnabledOptions())
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

function isNotFound(error: unknown): boolean {
  try {
    return extractErrorData(error).status === 404;
  } catch {
    return false;
  }
}

function RouteComponent() {
  const { tab = 'chats' } = Route.useSearch();
  const data = Route.useLoaderData();
  if ('noAccess' in data) return <WorkspaceNoAccessPage />;
  return (
    <WorkspacePage
      key={data.workspace.id}
      workspace={data.workspace}
      activeTab={tab}
      chats={data.chats}
      chatCount={data.chatCount}
      chatPagination={data.chatPagination}
      chatSearch={data.chatSearch}
      chatPage={data.chatPage}
      selectedModelId={data.selectedModelId}
      isEmbeddingModelEnabled={data.isEmbeddingModelEnabled}
    />
  );
}
