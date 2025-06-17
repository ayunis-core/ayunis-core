import { useInvitesControllerCreate } from "@/shared/api/generated/ayunisCoreAPI";
import type { InviteCreateData, InviteCreateResponse } from "../model/openapi";
import { useQueryClient } from "@tanstack/react-query";
import { showError, showSuccess } from "@/shared/lib/toast";

interface UseInviteCreateOptions {
  onSuccessCallback?: (token: string) => void;
}

export function useInviteCreate(options?: UseInviteCreateOptions) {
  const queryClient = useQueryClient();
  const createInviteMutation = useInvitesControllerCreate({
    mutation: {
      onSuccess: (response: InviteCreateResponse) => {
        console.log("Create invite succeeded, invalidating queries");
        showSuccess("Invitation sent successfully!");
        queryClient.invalidateQueries({
          queryKey: ["invites"],
        });
        console.log("invite created");

        // Call the success callback with the invite token
        if (options?.onSuccessCallback) {
          options.onSuccessCallback(response.inviteToken);
        }
      },
      onError: (err) => {
        console.error("Error creating invite", err);
        showError("Failed to send invitation. Please try again.");
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
