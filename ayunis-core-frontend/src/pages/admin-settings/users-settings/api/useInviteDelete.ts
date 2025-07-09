import {
  getInvitesControllerGetInvitesQueryKey,
  useInvitesControllerDeleteInvite,
} from "@/shared/api/generated/ayunisCoreAPI";
import type { Invite } from "../model/openapi";
import { useQueryClient } from "@tanstack/react-query";
import { showError, showSuccess } from "@/shared/lib/toast";

export function useInviteDelete() {
  const queryClient = useQueryClient();
  const deleteInviteMutation = useInvitesControllerDeleteInvite({
    mutation: {
      onMutate: async ({ id }) => {
        await queryClient.cancelQueries({
          queryKey: [getInvitesControllerGetInvitesQueryKey()],
        });
        const previousData = queryClient.getQueryData([
          getInvitesControllerGetInvitesQueryKey(),
        ]);

        queryClient.setQueryData(["invites"], (old: Invite[]) => {
          return old.filter((invite: Invite) => invite.id !== id);
        });
        return { previousData };
      },
      onSuccess: () => {
        showSuccess("Invite deleted successfully!");
        queryClient.invalidateQueries({
          queryKey: [getInvitesControllerGetInvitesQueryKey()],
        });
      },
      onError: (_, __, context) => {
        showError("Failed to delete invite. Please try again.");
        queryClient.setQueryData(
          [getInvitesControllerGetInvitesQueryKey()],
          context?.previousData,
        );
      },
    },
  });

  return {
    deleteInvite: deleteInviteMutation.mutate,
    isLoading: deleteInviteMutation.isPending,
    isError: deleteInviteMutation.isError,
    error: deleteInviteMutation.error,
  };
}
