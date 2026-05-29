import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { ChatsPage } from '@/pages/chats';
import {
  threadsControllerFindAll,
  getThreadsControllerFindAllQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';

const CHATS_PER_PAGE = 20;

const searchSchema = z.object({
  search: z.string().optional(),
  page: z.number().min(1).optional().catch(1),
});

export const Route = createFileRoute('/_authenticated/chats/')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps: { search, page = 1 }, context: { queryClient } }) => {
    const offset = (page - 1) * CHATS_PER_PAGE;
    const chatsResponse = await queryClient.fetchQuery({
      queryKey: getThreadsControllerFindAllQueryKey({
        search,
        limit: CHATS_PER_PAGE,
        offset,
      }),
      queryFn: () =>
        threadsControllerFindAll({
          search,
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
