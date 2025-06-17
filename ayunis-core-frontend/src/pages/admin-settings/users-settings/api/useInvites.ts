import { useInvitesControllerGetInvites } from "@/shared/api/generated/ayunisCoreAPI";
import type { Invite } from "../model/openapi";

interface UseInvitesOptions {
  initialData?: Invite[];
}

export function useInvites(options?: UseInvitesOptions) {
  const { data, isLoading, isError, error } = useInvitesControllerGetInvites({
    query: {
      initialData: options?.initialData,
      queryKey: ["invites"],
    },
  });

  return {
    invites: data || [],
    isLoading,
    isError,
    error,
  };
}
