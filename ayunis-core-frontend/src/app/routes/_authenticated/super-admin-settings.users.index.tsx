import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';
import SuperAdminUsersPage from '@/pages/super-admin-settings/users';
import {
  getSuperAdminUserListControllerGetAllUsersQueryKey,
  superAdminUserListControllerGetAllUsers,
} from '@/shared/api';

const USERS_PER_PAGE = 25;

const searchSchema = z.object({
  search: z.string().optional(),
  page: z.number().min(1).optional().catch(1),
});

export const Route = createFileRoute(
  '/_authenticated/super-admin-settings/users/',
)({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps: { search, page = 1 }, context: { queryClient } }) => {
    const params = {
      search,
      limit: USERS_PER_PAGE,
      offset: (page - 1) * USERS_PER_PAGE,
    };
    const response = await queryClient.fetchQuery({
      queryKey: getSuperAdminUserListControllerGetAllUsersQueryKey(params),
      queryFn: () => superAdminUserListControllerGetAllUsers(params),
    });
    const lastPage = Math.max(
      1,
      Math.ceil((response.pagination.total ?? 0) / USERS_PER_PAGE),
    );
    if (page > lastPage) {
      throw redirect({
        to: '/super-admin-settings/users',
        search: {
          search,
          page: lastPage === 1 ? undefined : lastPage,
        },
      });
    }

    return {
      users: response.data,
      pagination: response.pagination,
      search,
      page,
    };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { users, pagination, search, page } = Route.useLoaderData();
  return (
    <SuperAdminUsersPage
      users={users}
      pagination={pagination}
      search={search}
      currentPage={page}
    />
  );
}
