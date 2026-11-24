import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { ChatsPage } from '@/pages/chats';
import {
  threadsControllerFindAll,
  getThreadsControllerFindAllQueryKey,
} from '@ayunis/api-client/endpoints';
import { SessionClient } from '@ayunis/api-client/schemas';
import { searchParamString } from '@/shared/lib/search-params';

const CHATS_PER_PAGE = 20;

const searchSchema = z.object({
  search: searchParamString.optional(),
  page: z.number().min(1).optional().catch(1),
});

export const Route = createFileRoute('/_authenticated/chats/')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: async ({
    deps: { search, page = 1 },
    context: { queryClient, embedded },
  }) => {
    const offset = (page - 1) * CHATS_PER_PAGE;
    // The pane lists only its own chats, as the web app lists only its own.
    const client = embedded ? SessionClient.outlook : undefined;
    const chatsResponse = await queryClient.query({
      queryKey: getThreadsControllerFindAllQueryKey({
        search,
        client,
        limit: CHATS_PER_PAGE,
        offset,
      }),
      queryFn: () =>
        threadsControllerFindAll({
          search,
          client,
          limit: CHATS_PER_PAGE,
          offset,
        }),
    });
    const chats = chatsResponse.data;
    const pagination = chatsResponse.pagination;
    return { chats, pagination, search, page };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { chats, pagination, search, page } = Route.useLoaderData();
  const hasFilters = Boolean(search);
  return (
    <ChatsPage
      chats={chats}
      search={search}
      hasFilters={hasFilters}
      pagination={pagination}
      currentPage={page}
    />
  );
}
