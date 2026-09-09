import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import extractErrorData from '@/shared/api/extract-error-data';
import {
  getSkillsControllerFindAllQueryKey,
  getSkillsControllerFindOneQueryKey,
  skillsControllerActivate,
} from '@/shared/api/generated/ayunisCoreAPI';
import { personalSkillListParams } from '@/shared/api/skill-scopes';
import { showError, showSuccess } from '@/shared/lib/toast';

interface SetSkillActivationParams {
  id: string;
  isActive: boolean;
}

export function useSetSkillActivation() {
  const { t } = useTranslation('skills');
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: ({ id, isActive }: SetSkillActivationParams) =>
      skillsControllerActivate(id, { isActive }),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({
        queryKey: getSkillsControllerFindAllQueryKey(personalSkillListParams),
      });
      void queryClient.invalidateQueries({
        queryKey: getSkillsControllerFindOneQueryKey(id),
      });
      void router.invalidate();
      showSuccess(t('toggleActive.success'));
    },
    onError: (error) => {
      try {
        const { code } = extractErrorData(error);
        showError(
          t(
            code === 'SKILL_NOT_FOUND'
              ? 'toggleActive.notFound'
              : 'toggleActive.error',
          ),
        );
      } catch {
        showError(t('toggleActive.error'));
      }
    },
  });
}
