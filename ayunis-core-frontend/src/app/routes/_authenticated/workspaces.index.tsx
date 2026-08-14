import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';
import { WorkspacesPage } from '@/pages/workspaces';
import {
  workspacesControllerFindAll,
  getWorkspacesControllerFindAllQueryKey,
  appControllerFeatureToggles,
  getAppControllerFeatureTogglesQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';

const WORKSPACES_PER_PAGE = 20;

const searchSchema = z.object({
  search: z.string().optional(),
  page: z.number().min(1).optional().catch(1),
  sort: z
    .enum(['updatedAt', 'createdAt', 'alpha'])
    .optional()
    .catch('updatedAt'),
});

export const Route = createFileRoute('/_authenticated/workspaces/')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  component: RouteComponent,
  loader: async ({
    deps: { search, page = 1, sort = 'updatedAt' },
    context: { queryClient },
  }) => {
    const featureToggles = await queryClient.fetchQuery({
      queryKey: getAppControllerFeatureTogglesQueryKey(),
      queryFn: () => appControllerFeatureToggles(),
    });
    if (!featureToggles.workspacesEnabled) {
      throw redirect({ to: '/chat' });
    }
    const params = {
      search: search || undefined,
      sort: sort === 'alpha' ? ('name' as const) : sort,
      limit: WORKSPACES_PER_PAGE,
      offset: (page - 1) * WORKSPACES_PER_PAGE,
    };
    const response = await queryClient.fetchQuery({
      queryKey: getWorkspacesControllerFindAllQueryKey(params),
      queryFn: () => workspacesControllerFindAll(params),
    });
    return {
      workspaces: response.data,
      pagination: response.pagination,
      search,
      page,
      sort,
    };
  },
});

function RouteComponent() {
  const { workspaces, pagination, search, page, sort } = Route.useLoaderData();
  return (
    <WorkspacesPage
      workspaces={workspaces}
      pagination={pagination}
      search={search}
      currentPage={page}
      sortKey={sort}
    />
  );
}
