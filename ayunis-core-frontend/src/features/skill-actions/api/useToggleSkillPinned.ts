import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { showSuccess, showError } from '@/shared/lib/toast';
import {
  skillsControllerTogglePinned,
  getSkillsControllerFindAllQueryKey,
  getSkillsControllerFindOneQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import { useRouter } from '@tanstack/react-router';
import extractErrorData from '@/shared/api/extract-error-data';

interface ToggleSkillPinnedParams {
  id: string;
}

export function useToggleSkillPinned() {
  const { t } = useTranslation('skills');
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async ({ id }: ToggleSkillPinnedParams) => {
      return await skillsControllerTogglePinned(id);
    },
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({
        queryKey: getSkillsControllerFindAllQueryKey(),
      });
      void queryClient.invalidateQueries({
        queryKey: getSkillsControllerFindOneQueryKey(id),
      });
      void router.invalidate();
      showSuccess(t('togglePinned.success'));
    },
    onError: (error) => {
      console.error('Toggle skill pinned failed:', error);
      try {
        const { code } = extractErrorData(error);
        if (code === 'SKILL_NOT_FOUND') {
          showError(t('togglePinned.notFound'));
        } else {
          showError(t('togglePinned.error'));
        }
      } catch {
        // Non-AxiosError (network failure, request cancellation, etc.)
        showError(t('togglePinned.error'));
      }
    },
  });
}
