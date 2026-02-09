import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  useAgentsControllerInstallFromMarketplace,
  getAgentsControllerFindAllQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError, showSuccess } from '@/shared/lib/toast';

export function useInstallFromMarketplace() {
  const { t } = useTranslation('install');
  const queryClient = useQueryClient();
  const router = useRouter();

  return useAgentsControllerInstallFromMarketplace({
    mutation: {
      onSuccess: (agent) => {
        showSuccess(t('success'));
        void queryClient.invalidateQueries({
          queryKey: getAgentsControllerFindAllQueryKey(),
        });
        void router.navigate({
          to: '/agents/$id',
          params: { id: agent.id },
        });
      },
      onError: (error) => {
        try {
          const { code } = extractErrorData(error);
          switch (code) {
            case 'MARKETPLACE_AGENT_NOT_FOUND':
              showError(t('error.notFound.description'));
              break;
            case 'MARKETPLACE_UNAVAILABLE':
              showError(t('error.unavailable'));
              break;
            case 'NO_PERMITTED_MODEL':
              showError(t('error.noModel'));
              break;
            default:
              showError(t('error.generic'));
          }
        } catch {
          showError(t('error.generic'));
        }
      },
    },
  });
}
