import { useAuthenticationControllerLogout } from "@/shared/api/generated/ayunisCoreAPI";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";

export function useLogout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const logoutMutation = useAuthenticationControllerLogout({
    mutation: {
      onSuccess: () => {
        // Clear all queries to ensure user data is removed from cache
        queryClient.clear();
        // Redirect to login page
        navigate({ to: "/login" });
      },
      onError: (error) => {
        console.error("Logout failed:", error);
        // Even if logout fails on the server, we should still redirect to login
        // as the user intended to log out
        queryClient.clear();
        navigate({ to: "/login" });
      },
    },
  });

  const logout = () => {
    logoutMutation.mutate();
  };

  return {
    logout,
    isLoading: logoutMutation.isPending,
  };
}
