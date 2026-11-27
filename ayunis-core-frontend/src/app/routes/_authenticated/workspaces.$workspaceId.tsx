import { anonymousModeDefaultQueryOptions } from '@/features/anonymous-mode-default';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';
import { WorkspacePage } from '@/pages/workspace';
import {
  workspacesControllerFindOne,
  getWorkspacesControllerFindOneQueryKey,
  threadsControllerFindAll,
  getThreadsControllerFindAllQueryKey,
  modelsControllerIsEmbeddingModelEnabled,
  getModelsControllerIsEmbeddingModelEnabledQueryKey,
} from '@ayunis/api-client/endpoints';
import {
  defaultModelSelectionQueryOptions,
  toComposerValue,
} from '@/widgets/model-select-options';
import { searchParamString } from '@/shared/lib/search-params';

const WORKSPACE_CHATS_LIMIT = 20;

const searchSchema = z.object({
  search: searchParamString.optional(),
  page: z.number().min(1).optional().catch(1),
  tab: z
    .enum([
      'chats',
      'artifacts',
      'skills',
      'knowledge',
      'recordings',
      'instructions',
    ])
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
        .catch(() => {
          throw redirect({ to: '/workspaces' });
        });

      const chats = await queryClient.query({
        queryKey: getThreadsControllerFindAllQueryKey(chatsParams),
        queryFn: () => threadsControllerFindAll(chatsParams),
      });

      const [defaultSelection] = await Promise.all([
        queryClient
          .query(defaultModelSelectionQueryOptions())
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
        selectedModelId: toComposerValue(defaultSelection),
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
    />
  );
}
