import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  useSkillsControllerInstallFromMarketplace,
  getSkillsControllerFindAllQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError, showSuccess } from '@/shared/lib/toast';

export function useInstallFromMarketplace() {
  const { t } = useTranslation('install');
  const queryClient = useQueryClient();
  const router = useRouter();

  return useSkillsControllerInstallFromMarketplace({
    mutation: {
      onSuccess: (skill) => {
        showSuccess(t('success'));
        void queryClient.invalidateQueries({
          queryKey: getSkillsControllerFindAllQueryKey(),
        });
        void router.navigate({
          to: '/skills/$id',
          params: { id: skill.id },
        });
      },
      onError: (error) => {
        try {
          const { code } = extractErrorData(error);
          switch (code) {
            case 'MARKETPLACE_SKILL_NOT_FOUND':
              showError(t('error.notFound.description'));
              break;
            case 'MARKETPLACE_UNAVAILABLE':
              showError(t('error.unavailable'));
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
