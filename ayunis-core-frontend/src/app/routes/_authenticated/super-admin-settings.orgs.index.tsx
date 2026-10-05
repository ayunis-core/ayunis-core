import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import SuperAdminOrgsPage from '@/pages/super-admin-settings/orgs';
import {
  SuperAdminOrgsControllerGetAllOrgsStatus,
  getSuperAdminOrgsControllerGetAllOrgsQueryKey,
  superAdminOrgsControllerGetAllOrgs,
} from '@/shared/api';

const ORGS_PER_PAGE = 25;

const searchSchema = z.object({
  search: z.string().optional(),
  orgStatus: z
    .enum(SuperAdminOrgsControllerGetAllOrgsStatus)
    .optional()
    .catch(SuperAdminOrgsControllerGetAllOrgsStatus.active),
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
      orgStatus: status = SuperAdminOrgsControllerGetAllOrgsStatus.active,
      page = 1,
    },
    context: { queryClient },
  }) => {
    const offset = (page - 1) * ORGS_PER_PAGE;
    const response = await queryClient.fetchQuery({
      queryKey: getSuperAdminOrgsControllerGetAllOrgsQueryKey({
        search,
        status,
        limit: ORGS_PER_PAGE,
        offset,
      }),
      queryFn: () =>
        superAdminOrgsControllerGetAllOrgs({
          search,
          status,
          limit: ORGS_PER_PAGE,
          offset,
        }),
    });
    const orgs = response.data;
    const pagination = response.pagination;
    return { orgs, pagination, search, status, page };
  },
});

function RouteComponent() {
  const { orgs, pagination, search, status, page } = Route.useLoaderData();
  return (
    <SuperAdminOrgsPage
      orgs={orgs}
      pagination={pagination}
      search={search}
      status={status}
      currentPage={page}
    />
  );
}
