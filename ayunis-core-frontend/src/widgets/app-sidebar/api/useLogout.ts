import { useSsoLoginControllerLogout } from '@/shared/api/generated/ayunisCoreAPI';
import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { clearAppsignalTags } from '@/shared/lib/appsignal';
import { navigateToExternalUrl } from '@/features/sso';
import { showError } from '@/shared/lib/toast';
import { useTranslation } from 'react-i18next';

export function useLogout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation('common');
  const logoutMutation = useSsoLoginControllerLogout();

  function clearLocalState(): void {
    queryClient.clear();
    clearAppsignalTags();
  }

  const logout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: ({ brokerLogoutUrl }) => {
        clearLocalState();
        if (brokerLogoutUrl) {
          navigateToExternalUrl(brokerLogoutUrl);
          return;
        }
        void navigate({ to: '/login' });
      },
      onError: () => {
        clearLocalState();
        showError(t('sidebar.logout.error'));
        void navigate({ to: '/login' });
      },
    });
  };

  return {
    logout,
    isLoading: logoutMutation.isPending,
  };
}
