import { useUserControllerDeleteUser } from "@/shared/api/generated/ayunisCoreAPI";
import { useQueryClient } from "@tanstack/react-query";
import { showError, showSuccess } from "@/shared/lib/toast";
import { useTranslation } from "react-i18next";
import { useLogout } from "@/widgets/app-sidebar/api/useLogout";
import extractErrorData from "@/shared/api/extract-error-data";

export function useDeleteAccount() {
  const queryClient = useQueryClient();
  const { t } = useTranslation("settings");
  const { logout } = useLogout();

  const deleteAccountMutation = useUserControllerDeleteUser({
    mutation: {
      onSuccess: () => {
        showSuccess(t("account.deleteAccountSuccess"));
        queryClient.clear();
        logout();
      },
      onError: (err) => {
        console.error("Error deleting account", err);
        const { code } = extractErrorData(err);
        
        if (code === "CANNOT_DELETE_LAST_ADMIN") {
          showError(t("account.deleteAccountError.lastAdmin"));
        } else {
          showError(t("account.deleteAccountError.generic"));
        }
      },
    },
  });

  function deleteAccount(userId: string) {
    deleteAccountMutation.mutate({ id: userId });
  }

  return {
    deleteAccount,
    isLoading: deleteAccountMutation.isPending,
    isError: deleteAccountMutation.isError,
    error: deleteAccountMutation.error,
  };
}

