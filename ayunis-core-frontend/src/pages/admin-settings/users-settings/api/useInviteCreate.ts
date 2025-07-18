import {
  getInvitesControllerGetInvitesQueryKey,
  useInvitesControllerCreate,
  getSubscriptionsControllerGetSubscriptionQueryKey,
} from "@/shared/api/generated/ayunisCoreAPI";
import type { InviteCreateData } from "../model/openapi";
import { useQueryClient } from "@tanstack/react-query";
import { showError, showSuccess } from "@/shared/lib/toast";
import { useRouter } from "@tanstack/react-router";

export function useInviteCreate() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const createInviteMutation = useInvitesControllerCreate({
    mutation: {
      onSuccess: () => {
        showSuccess("Invitation sent successfully!");
      },
      onError: () => {
        showError("Failed to send invitation. Please try again.");
      },
      onSettled: () => {
        queryClient.invalidateQueries({
          queryKey: getInvitesControllerGetInvitesQueryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: getSubscriptionsControllerGetSubscriptionQueryKey(),
        });
        router.invalidate();
      },
    },
  });

  function createInvite(data: InviteCreateData) {
    const inviteData: InviteCreateData = {
      email: data.email,
      role: data.role,
    };

    createInviteMutation.mutate({ data: inviteData });
  }

  return {
    createInvite,
    isLoading: createInviteMutation.isPending,
    isError: createInviteMutation.isError,
    error: createInviteMutation.error,
  };
}
