import {
  getSuperAdminUsersControllerGetUsersByOrgIdQueryKey,
  useSuperAdminUsersControllerDeleteUser,
} from "@/shared/api/generated/ayunisCoreAPI";
import { useQueryClient } from "@tanstack/react-query";
import { showError, showSuccess } from "@/shared/lib/toast";
import { useTranslation } from "react-i18next";

interface UseSuperAdminDeleteUserOptions {
  orgId: string;
  onSuccessCallback?: () => void;
}

export function useSuperAdminDeleteUser(
  options: UseSuperAdminDeleteUserOptions,
) {
  const queryClient = useQueryClient();
  const { t } = useTranslation("super-admin-settings-org");
  const deleteUserMutation = useSuperAdminUsersControllerDeleteUser({
    mutation: {
      onSuccess: () => {
        console.log("Delete user succeeded, invalidating queries");
        showSuccess(t("deleteUser.success"));
        queryClient.invalidateQueries({
          queryKey: getSuperAdminUsersControllerGetUsersByOrgIdQueryKey(
            options.orgId,
          ),
        });

        // Call the success callback
        if (options.onSuccessCallback) {
          options.onSuccessCallback();
        }
      },
      onError: (err) => {
        console.error("Error deleting user", err);
        showError(t("deleteUser.error"));
      },
    },
  });

  function deleteUser(userId: string) {
    deleteUserMutation.mutate({ userId });
  }

  return {
    deleteUser,
    isLoading: deleteUserMutation.isPending,
    isError: deleteUserMutation.isError,
    error: deleteUserMutation.error,
  };
}
