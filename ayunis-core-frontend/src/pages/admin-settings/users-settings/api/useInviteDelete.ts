import {
  getInvitesControllerGetInvitesQueryKey,
  getSubscriptionsControllerGetSubscriptionQueryKey,
  useInvitesControllerDeleteInvite,
} from "@/shared/api/generated/ayunisCoreAPI";
import type { Invite } from "../model/openapi";
import { useQueryClient } from "@tanstack/react-query";
import { showError } from "@/shared/lib/toast";
import { useRouter } from "@tanstack/react-router";
import extractErrorData from "@/shared/api/extract-error-data";
import { useTranslation } from "react-i18next";

export function useInviteDelete() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { t } = useTranslation("admin-settings-users");
  const deleteInviteMutation = useInvitesControllerDeleteInvite({
    mutation: {
      onMutate: async ({ id }) => {
        await queryClient.cancelQueries({
          queryKey: getInvitesControllerGetInvitesQueryKey(),
        });
        const previousData = queryClient.getQueryData(
          getInvitesControllerGetInvitesQueryKey(),
        );

        queryClient.setQueryData(
          getInvitesControllerGetInvitesQueryKey(),
          (old: Invite[]) => {
            return old.filter((invite: Invite) => invite.id !== id);
          },
        );
        return { previousData };
      },
      onError: (error, _, context) => {
        console.log(error);
        const { code } = extractErrorData(error);
        switch (code) {
          case "INVITE_NOT_FOUND":
            showError(t("inviteDelete.error.inviteNotFound"));
            break;
          default:
            showError(t("inviteDelete.error.unexpectedError"));
        }
        queryClient.setQueryData(
          getInvitesControllerGetInvitesQueryKey(),
          context?.previousData,
        );
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

  return {
    deleteInvite: deleteInviteMutation.mutate,
    isLoading: deleteInviteMutation.isPending,
    isError: deleteInviteMutation.isError,
    error: deleteInviteMutation.error,
  };
}
