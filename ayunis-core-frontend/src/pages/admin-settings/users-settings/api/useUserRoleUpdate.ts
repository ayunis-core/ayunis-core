import { useUserControllerUpdateUserRole } from "@/shared/api/generated/ayunisCoreAPI";
import { useQueryClient } from "@tanstack/react-query";
import { showError, showSuccess } from "@/shared/lib/toast";
import type { UserRole } from "../model/openapi";

interface UserRoleUpdateData {
  id: string;
  role: UserRole;
}

interface UseUserRoleUpdateOptions {
  onSuccessCallback?: () => void;
}

export function useUserRoleUpdate(options?: UseUserRoleUpdateOptions) {
  const queryClient = useQueryClient();
  const updateUserRoleMutation = useUserControllerUpdateUserRole({
    mutation: {
      onSuccess: () => {
        console.log("Update user role succeeded, invalidating queries");
        showSuccess("User role updated successfully!");
        queryClient.invalidateQueries({
          queryKey: ["users"],
        });

        // Call the success callback
        if (options?.onSuccessCallback) {
          options.onSuccessCallback();
        }
      },
      onError: (err) => {
        console.error("Error updating user role", err);
        showError("Failed to update user role.");
      },
    },
  });

  function updateUserRole(data: UserRoleUpdateData) {
    const roleData = {
      role: data.role,
    };

    updateUserRoleMutation.mutate({
      id: data.id,
      data: roleData,
    });
  }

  return {
    updateUserRole,
    isLoading: updateUserRoleMutation.isPending,
    isError: updateUserRoleMutation.isError,
    error: updateUserRoleMutation.error,
  };
}
