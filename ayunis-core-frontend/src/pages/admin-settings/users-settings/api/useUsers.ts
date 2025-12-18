import {
  getUserControllerGetUsersInOrganizationQueryKey,
  useUserControllerGetUsersInOrganization,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { User } from '../model/openapi';

interface UseUsersOptions {
  initialData?: User[];
}

export function useUsers(options?: UseUsersOptions) {
  const { data, isLoading, isError, error } =
    useUserControllerGetUsersInOrganization(undefined, {
      query: {
        initialData: options?.initialData
          ? {
              data: options.initialData,
              pagination: {
                total: options.initialData.length,
                limit: 25,
                offset: 0,
              },
            }
          : undefined,
        queryKey: getUserControllerGetUsersInOrganizationQueryKey(),
      },
    });

  return {
    users: data?.data || [],
    isLoading,
    isError,
    error,
  };
}
