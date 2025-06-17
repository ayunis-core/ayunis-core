import { useInvitesControllerDeleteInvite } from "@/shared/api/generated/ayunisCoreAPI";
import type { Invite } from "../model/openapi";
import { useQueryClient } from "@tanstack/react-query";
import { showError, showSuccess } from "@/shared/lib/toast";

export function useInviteDelete() {
  const queryClient = useQueryClient();
  const deleteInviteMutation = useInvitesControllerDeleteInvite({
    mutation: {
      onMutate: async ({ id }) => {
        console.log("Deleting invite");
        await queryClient.cancelQueries({
          queryKey: ["invites"],
        });
        const previousData = queryClient.getQueryData(["invites"]);

        queryClient.setQueryData(["invites"], (old: Invite[]) => {
          return old.filter((invite: Invite) => invite.id !== id);
        });
        return { previousData };
      },
      onSuccess: () => {
        console.log("Delete invite succeeded, invalidating queries");
        showSuccess("Invite deleted successfully!");
        queryClient.invalidateQueries({
          queryKey: ["invites"],
        });
        console.log("invite deleted");
      },
      onError: (err, _, context) => {
        console.error("Error deleting invite", err);
        showError("Failed to delete invite. Please try again.");
        queryClient.setQueryData(["invites"], context?.previousData);
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
