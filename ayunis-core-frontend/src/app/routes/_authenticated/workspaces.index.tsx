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
  page: z.number().min(1).optional().catch(1),
});

export const Route = createFileRoute('/_authenticated/workspaces/')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  component: RouteComponent,
  loader: async ({ deps: { page = 1 }, context: { queryClient } }) => {
    const featureToggles = await queryClient.fetchQuery({
      queryKey: getAppControllerFeatureTogglesQueryKey(),
      queryFn: () => appControllerFeatureToggles(),
    });
    if (!featureToggles.workspacesEnabled) {
      throw redirect({ to: '/chat' });
    }
    const params = {
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
      page,
    };
  },
});

function RouteComponent() {
  const { workspaces, pagination, page } = Route.useLoaderData();
  return (
    <WorkspacesPage
      workspaces={workspaces}
      pagination={pagination}
      currentPage={page}
    />
  );
}
