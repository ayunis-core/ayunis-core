import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { showSuccess, showError } from '@/shared/lib/toast';
import {
  useSkillsControllerDelete,
  getSkillsControllerFindAllQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import { useNavigate, useRouter } from '@tanstack/react-router';
import extractErrorData from '@/shared/api/extract-error-data';

export function useDeleteSkill() {
  const { t } = useTranslation('skill');
  const queryClient = useQueryClient();
  const router = useRouter();
  const navigate = useNavigate();

  return useSkillsControllerDelete({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: getSkillsControllerFindAllQueryKey(),
        });
        void router.invalidate();
        showSuccess(t('delete.success'));
        void navigate({ to: '/skills' });
      },
      onError: (error) => {
        console.error('Delete skill failed:', error);
        try {
          const { code } = extractErrorData(error);
          switch (code) {
            case 'SKILL_NOT_FOUND':
              showError(t('delete.notFound'));
              break;
            default:
              showError(t('delete.error'));
          }
        } catch {
          showError(t('delete.error'));
        }
      },
    },
  });
}
