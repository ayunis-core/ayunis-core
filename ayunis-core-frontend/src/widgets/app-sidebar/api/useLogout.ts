import { useAuthenticationControllerLogout } from '@/shared/api/generated/ayunisCoreAPI';
import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { clearAppsignalTags } from '@/shared/lib/appsignal';

export function useLogout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const logoutMutation = useAuthenticationControllerLogout({
    mutation: {
      onSuccess: () => {
        // Clear all queries to ensure user data is removed from cache
        queryClient.clear();
        clearAppsignalTags();
        // Redirect to login page
        void navigate({ to: '/login' });
      },
      onError: (error) => {
        console.error('Logout failed:', error);
        // Even if logout fails on the server, we should still redirect to login
        // as the user intended to log out
        queryClient.clear();
        clearAppsignalTags();
        void navigate({ to: '/login' });
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
