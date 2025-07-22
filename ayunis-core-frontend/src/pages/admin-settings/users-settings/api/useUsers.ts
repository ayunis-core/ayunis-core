import {
  getUserControllerGetUsersInOrganizationQueryKey,
  useUserControllerGetUsersInOrganization,
} from "@/shared/api/generated/ayunisCoreAPI";
import type { User } from "../model/openapi";

interface UseUsersOptions {
  initialData?: User[];
}

export function useUsers(options?: UseUsersOptions) {
  const { data, isLoading, isError, error } =
    useUserControllerGetUsersInOrganization({
      query: {
        initialData: options?.initialData
          ? { users: options.initialData }
          : undefined,
        queryKey: getUserControllerGetUsersInOrganizationQueryKey(),
      },
    });

  return {
    users: data?.users || [],
    isLoading,
    isError,
    error,
  };
}
