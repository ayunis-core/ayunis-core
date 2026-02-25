import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { showSuccess, showError } from '@/shared/lib/toast';
import {
  skillsControllerToggleActive,
  getSkillsControllerFindAllQueryKey,
  getSkillsControllerFindOneQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import { useRouter } from '@tanstack/react-router';
import extractErrorData from '@/shared/api/extract-error-data';

interface ToggleSkillActiveParams {
  id: string;
}

export function useToggleSkillActive() {
  const { t } = useTranslation('skills');
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async ({ id }: ToggleSkillActiveParams) => {
      return await skillsControllerToggleActive(id);
    },
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({
        queryKey: getSkillsControllerFindAllQueryKey(),
      });
      void queryClient.invalidateQueries({
        queryKey: getSkillsControllerFindOneQueryKey(id),
      });
      void router.invalidate();
      showSuccess(t('toggleActive.success'));
    },
    onError: (error) => {
      console.error('Toggle skill active failed:', error);
      try {
        const { code } = extractErrorData(error);
        if (code === 'SKILL_NOT_FOUND') {
          showError(t('toggleActive.notFound'));
        } else {
          showError(t('toggleActive.error'));
        }
      } catch {
        // Non-AxiosError (network failure, request cancellation, etc.)
        showError(t('toggleActive.error'));
      }
    },
  });
}
