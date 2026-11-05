import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import SuperAdminOrgsPage from '@/pages/super-admin-settings/orgs';
import {
  OrgLifecycleFilter,
  OrgsSortField,
  getSuperAdminOrgsControllerGetAllOrgsQueryKey,
  superAdminOrgsControllerGetAllOrgs,
} from '@/shared/api';
import { sortFieldSchema, sortOrderSchema } from '@/shared/lib/table-sort';
import { searchParamString } from '@/shared/lib/search-params';

const ORGS_PER_PAGE = 25;

const searchSchema = z.object({
  search: searchParamString.optional(),
  orgLifecycle: z
    .enum(OrgLifecycleFilter)
    .optional()
    .catch(OrgLifecycleFilter.all),
  page: z.number().min(1).optional().catch(1),
  sortBy: sortFieldSchema(OrgsSortField),
  sortOrder: sortOrderSchema,
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
      sortBy,
      sortOrder,
    },
    context: { queryClient },
  }) => {
    const offset = (page - 1) * ORGS_PER_PAGE;
    const params = {
      search,
      lifecycle,
      sortBy,
      sortOrder,
      limit: ORGS_PER_PAGE,
      offset,
    };
    const response = await queryClient.query({
      queryKey: getSuperAdminOrgsControllerGetAllOrgsQueryKey(params),
      queryFn: () => superAdminOrgsControllerGetAllOrgs(params),
    });
    return {
      orgs: response.data,
      pagination: response.pagination,
      lifecycleCounts: response.lifecycleCounts,
      search,
      lifecycle,
      page,
      sort: { sortBy, sortOrder },
    };
  },
});

function RouteComponent() {
  const { orgs, pagination, lifecycleCounts, search, lifecycle, page, sort } =
    Route.useLoaderData();
  return (
    <SuperAdminOrgsPage
      orgs={orgs}
      pagination={pagination}
      lifecycleCounts={lifecycleCounts}
      search={search}
      lifecycle={lifecycle}
      currentPage={page}
      sort={sort}
    />
  );
}
