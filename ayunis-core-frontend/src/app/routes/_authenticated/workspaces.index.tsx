import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { WorkspacesPage } from '@/pages/workspaces';
import { WORKSPACES_PER_PAGE } from '@/features/workspaces';
import {
  workspacesControllerFindAll,
  getWorkspacesControllerFindAllQueryKey,
} from '@ayunis/api-client/endpoints';
import { loadChatStarterDefaults } from './-chat-starter-defaults-query';

const searchSchema = z.object({
  page: z.number().min(1).optional().catch(1),
});

export const Route = createFileRoute('/_authenticated/workspaces/')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  component: RouteComponent,
  loader: async ({ deps: { page = 1 }, context: { queryClient } }) => {
    const params = {
      limit: WORKSPACES_PER_PAGE,
      offset: (page - 1) * WORKSPACES_PER_PAGE,
    };
    const [response, chatStarter] = await Promise.all([
      queryClient.query({
        queryKey: getWorkspacesControllerFindAllQueryKey(params),
        queryFn: () => workspacesControllerFindAll(params),
      }),
      loadChatStarterDefaults(queryClient),
    ]);
    return {
      workspaces: response.data,
      pagination: response.pagination,
      page,
      chatStarter,
    };
  },
});

function RouteComponent() {
  const { workspaces, pagination, page, chatStarter } = Route.useLoaderData();
  return (
    <WorkspacesPage
      workspaces={workspaces}
      pagination={pagination}
      currentPage={page}
      chatStarter={chatStarter}
    />
  );
}
