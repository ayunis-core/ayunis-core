import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { ChatsPage } from '@/pages/chats';
import {
  threadsControllerFindAll,
  getThreadsControllerFindAllQueryKey,
  agentsControllerFindAll,
  getAgentsControllerFindAllQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';

const searchSchema = z.object({
  search: z.string().optional(),
  agentId: z.string().optional(),
});

export const Route = createFileRoute('/_authenticated/chats/')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps: { search, agentId }, context: { queryClient } }) => {
    const [chats, agents] = await Promise.all([
      queryClient.fetchQuery({
        queryKey: getThreadsControllerFindAllQueryKey({ search, agentId }),
        queryFn: () => threadsControllerFindAll({ search, agentId }),
      }),
      queryClient.fetchQuery({
        queryKey: getAgentsControllerFindAllQueryKey(),
        queryFn: () => agentsControllerFindAll(),
      }),
    ]);
    return { chats, agents, search, agentId };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { chats, agents, search, agentId } = Route.useLoaderData();
  const hasFilters = Boolean(search || agentId);
  return (
    <ChatsPage
      chats={chats}
      agents={agents}
      search={search}
      agentId={agentId}
      hasFilters={hasFilters}
    />
  );
}
