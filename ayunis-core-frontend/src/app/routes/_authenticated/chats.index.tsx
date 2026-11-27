import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { chatHistoryQuery } from '@ayunis/chat/surface';
import { ChatsPage } from '@/pages/chats';
import { searchParamString } from '@/shared/lib/search-params';

const searchSchema = z.object({
  search: searchParamString.optional(),
  page: z.number().min(1).optional().catch(1),
});

export const Route = createFileRoute('/_authenticated/chats/')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  // The package history loads the same page; loading it first keeps the page
  // from showing a loading state on navigation.
  loader: async ({
    deps: { search, page = 1 },
    context: { queryClient, user },
  }) => {
    await queryClient.query(chatHistoryQuery({ search, page }));
    return {
      search,
      page,
      sessionKey: JSON.stringify([user.id, user.orgId]),
    };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { search, page, sessionKey } = Route.useLoaderData();
  return <ChatsPage sessionKey={sessionKey} search={search} page={page} />;
}
