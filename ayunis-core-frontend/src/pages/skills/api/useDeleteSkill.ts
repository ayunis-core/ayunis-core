import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { showSuccess, showError } from '@/shared/lib/toast';
import {
  skillsControllerDelete,
  getSkillsControllerFindAllQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import { useRouter } from '@tanstack/react-router';
import extractErrorData from '@/shared/api/extract-error-data';

interface DeleteSkillParams {
  id: string;
}

export function useDeleteSkill() {
  const { t } = useTranslation('skills');
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async ({ id }: DeleteSkillParams) => {
      await skillsControllerDelete(id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: getSkillsControllerFindAllQueryKey(),
      });
      void router.invalidate();
      showSuccess(t('delete.success'));
    },
    onError: (error) => {
      console.error('Delete skill failed:', error);
      try {
        const { code } = extractErrorData(error);
        if (code === 'SKILL_NOT_FOUND') {
          showError(t('delete.notFound'));
        } else {
          showError(t('delete.error'));
        }
      } catch {
        // Non-AxiosError (network failure, request cancellation, etc.)
        showError(t('delete.error'));
      }
    },
  });
}
