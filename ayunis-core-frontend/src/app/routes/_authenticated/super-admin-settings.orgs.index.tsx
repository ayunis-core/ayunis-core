import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import SuperAdminOrgsPage from '@/pages/super-admin-settings/orgs';
import {
  OrgLifecycleFilter,
  getSuperAdminOrgsControllerGetAllOrgsQueryKey,
  superAdminOrgsControllerGetAllOrgs,
} from '@/shared/api';

const ORGS_PER_PAGE = 25;

const searchSchema = z.object({
  search: z.string().optional(),
  orgLifecycle: z
    .enum(OrgLifecycleFilter)
    .optional()
    .catch(OrgLifecycleFilter.all),
  page: z.number().min(1).optional().catch(1),
});

export const Route = createFileRoute(
  '/_authenticated/super-admin-settings/orgs/',
)({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  component: RouteComponent,
  loader: async ({
    deps: {
      search,
      orgLifecycle: lifecycle = OrgLifecycleFilter.all,
      page = 1,
    },
    context: { queryClient },
  }) => {
    const offset = (page - 1) * ORGS_PER_PAGE;
    const params = { search, lifecycle, limit: ORGS_PER_PAGE, offset };
    const response = await queryClient.query({
      queryKey: getSuperAdminOrgsControllerGetAllOrgsQueryKey(params),
      queryFn: () => superAdminOrgsControllerGetAllOrgs(params),
    });
    return {
      orgs: response.data,
      pagination: response.pagination,
      search,
      lifecycle,
      page,
    };
  },
});

function RouteComponent() {
  const { orgs, pagination, search, lifecycle, page } = Route.useLoaderData();
  return (
    <SuperAdminOrgsPage
      orgs={orgs}
      pagination={pagination}
      search={search}
      lifecycle={lifecycle}
      currentPage={page}
    />
  );
}
