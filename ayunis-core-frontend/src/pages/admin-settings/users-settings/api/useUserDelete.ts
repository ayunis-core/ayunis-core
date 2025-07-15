import {
  getUserControllerGetUsersInOrganizationQueryKey,
  useUserControllerDeleteUser,
} from "@/shared/api/generated/ayunisCoreAPI";
import { useQueryClient } from "@tanstack/react-query";
import { showError, showSuccess } from "@/shared/lib/toast";

interface UseUserDeleteOptions {
  onSuccessCallback?: () => void;
}

export function useUserDelete(options?: UseUserDeleteOptions) {
  const queryClient = useQueryClient();
  const deleteUserMutation = useUserControllerDeleteUser({
    mutation: {
      onSuccess: () => {
        console.log("Delete user succeeded, invalidating queries");
        showSuccess("User deleted successfully!");
        queryClient.invalidateQueries({
          queryKey: [...getUserControllerGetUsersInOrganizationQueryKey()],
        });

        // Call the success callback
        if (options?.onSuccessCallback) {
          options.onSuccessCallback();
        }
      },
      onError: (err) => {
        console.error("Error deleting user", err);
        showError("Failed to delete user.");
      },
    },
  });

  function deleteUser(userId: string) {
    deleteUserMutation.mutate({ id: userId });
  }

  return {
    deleteUser,
    isLoading: deleteUserMutation.isPending,
    isError: deleteUserMutation.isError,
    error: deleteUserMutation.error,
  };
}
