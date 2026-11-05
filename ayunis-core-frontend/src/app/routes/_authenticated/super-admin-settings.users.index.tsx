import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';
import SuperAdminUsersPage from '@/pages/super-admin-settings/users';
import {
  getSuperAdminUserListControllerGetAllUsersQueryKey,
  superAdminUserListControllerGetAllUsers,
  SuperAdminUsersSortField,
} from '@/shared/api';
import { sortFieldSchema, sortOrderSchema } from '@/shared/lib/table-sort';
import { searchParamString } from '@/shared/lib/search-params';

const USERS_PER_PAGE = 25;

const searchSchema = z.object({
  search: searchParamString.optional(),
  page: z.number().min(1).optional().catch(1),
  sortBy: sortFieldSchema(SuperAdminUsersSortField),
  sortOrder: sortOrderSchema,
});

export const Route = createFileRoute(
  '/_authenticated/super-admin-settings/users/',
)({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: async ({
    deps: { search, page = 1, sortBy, sortOrder },
    context: { queryClient },
  }) => {
    const params = {
      search,
      sortBy,
      sortOrder,
      limit: USERS_PER_PAGE,
      offset: (page - 1) * USERS_PER_PAGE,
    };
    const response = await queryClient.query({
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
          sortBy,
          sortOrder,
          page: lastPage === 1 ? undefined : lastPage,
        },
      });
    }

    return {
      users: response.data,
      pagination: response.pagination,
      search,
      page,
      sort: { sortBy, sortOrder },
    };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { users, pagination, search, page, sort } = Route.useLoaderData();
  return (
    <SuperAdminUsersPage
      users={users}
      pagination={pagination}
      search={search}
      currentPage={page}
      sort={sort}
    />
  );
}
