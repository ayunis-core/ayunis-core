import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import extractErrorData from '@/shared/api/extract-error-data';
import {
  getSkillsControllerFindAllQueryKey,
  getSkillsControllerFindOneQueryKey,
  skillsControllerPin,
} from '@/shared/api/generated/ayunisCoreAPI';
import { personalSkillListParams } from '@/shared/api/skill-scopes';
import { showError, showSuccess } from '@/shared/lib/toast';

interface SetSkillPinParams {
  id: string;
  isPinned: boolean;
}

export function useSetSkillPin() {
  const { t } = useTranslation('skills');
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: ({ id, isPinned }: SetSkillPinParams) =>
      skillsControllerPin(id, { isPinned }),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({
        queryKey: getSkillsControllerFindAllQueryKey(personalSkillListParams),
      });
      void queryClient.invalidateQueries({
        queryKey: getSkillsControllerFindOneQueryKey(id),
      });
      void router.invalidate();
      showSuccess(t('togglePinned.success'));
    },
    onError: (error) => {
      try {
        const { code } = extractErrorData(error);
        showError(
          t(
            code === 'SKILL_NOT_FOUND'
              ? 'togglePinned.notFound'
              : 'togglePinned.error',
          ),
        );
      } catch {
        showError(t('togglePinned.error'));
      }
    },
  });
}
