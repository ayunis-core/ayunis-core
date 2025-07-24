import {
  getInvitesControllerGetInvitesQueryKey,
  useInvitesControllerCreate,
  getSubscriptionsControllerGetSubscriptionQueryKey,
} from "@/shared/api/generated/ayunisCoreAPI";
import type { InviteCreateData } from "../model/openapi";
import { useQueryClient } from "@tanstack/react-query";
import { showError, showSuccess } from "@/shared/lib/toast";
import { useRouter } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import extractErrorData from "@/shared/api/extract-error-data";

export function useInviteCreate() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { t } = useTranslation("admin-settings-users");
  const createInviteMutation = useInvitesControllerCreate({
    mutation: {
      onSuccess: () => {
        showSuccess(t("inviteCreate.success"));
      },
      onError: (error) => {
        const { code } = extractErrorData(error);
        switch (code) {
          case "EMAIL_NOT_AVAILABLE":
            showError(t("inviteCreate.emailNotAvailable"));
            break;
          default:
            showError(t("inviteCreate.error"));
        }
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
