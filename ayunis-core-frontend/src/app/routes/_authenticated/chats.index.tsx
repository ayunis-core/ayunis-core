import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { ChatsPage } from '@/pages/chats';
import {
  threadsControllerFindAll,
  getThreadsControllerFindAllQueryKey,
  agentsControllerFindAll,
  getAgentsControllerFindAllQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';

const CHATS_PER_PAGE = 20;

const searchSchema = z.object({
  search: z.string().optional(),
  agentId: z.string().optional(),
  page: z.number().min(1).optional().catch(1),
});

export const Route = createFileRoute('/_authenticated/chats/')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: async ({
    deps: { search, agentId, page = 1 },
    context: { queryClient },
  }) => {
    const offset = (page - 1) * CHATS_PER_PAGE;
    const [chatsResponse, agents] = await Promise.all([
      queryClient.fetchQuery({
        queryKey: getThreadsControllerFindAllQueryKey({
          search,
          agentId,
          limit: CHATS_PER_PAGE,
          offset,
        }),
        queryFn: () =>
          threadsControllerFindAll({
            search,
            agentId,
            limit: CHATS_PER_PAGE,
            offset,
          }),
      }),
      queryClient.fetchQuery({
        queryKey: getAgentsControllerFindAllQueryKey(),
        queryFn: () => agentsControllerFindAll(),
      }),
    ]);
    const chats = chatsResponse.data;
    const pagination = chatsResponse.pagination;
    return { chats, pagination, agents, search, agentId, page };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { chats, pagination, agents, search, agentId, page } =
    Route.useLoaderData();
  const hasFilters = Boolean(search || agentId);
  return (
    <ChatsPage
      chats={chats}
      agents={agents}
      search={search}
      agentId={agentId}
      hasFilters={hasFilters}
      pagination={pagination}
      currentPage={page}
    />
  );
}
