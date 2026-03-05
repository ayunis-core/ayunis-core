import { useQueryClient } from '@tanstack/react-query';
import { showSuccess, showError } from '@/shared/lib/toast';
import {
  useSuperAdminSkillTemplatesControllerDelete,
  getSuperAdminSkillTemplatesControllerFindAllQueryKey,
} from '@/shared/api';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import extractErrorData from '@/shared/api/extract-error-data';

export function useDeleteSkillTemplate() {
  const { t } = useTranslation('super-admin-settings-skills');
  const queryClient = useQueryClient();
  const router = useRouter();
  const mutation = useSuperAdminSkillTemplatesControllerDelete({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: getSuperAdminSkillTemplatesControllerFindAllQueryKey(),
        });
        showSuccess(t('toast.deleteSuccess'));
      },
      onError: (error: unknown) => {
        console.error('Delete skill template failed:', error);
        try {
          const { code } = extractErrorData(error);
          if (code === 'SKILL_TEMPLATE_NOT_FOUND') {
            showError(t('toast.notFound'));
          } else {
            showError(t('toast.deleteError'));
          }
        } catch {
          showError(t('toast.deleteError'));
        }
      },
      onSettled: async () => {
        await router.invalidate();
      },
    },
  });

  function deleteSkillTemplate(id: string) {
    mutation.mutate({ id });
  }

  return {
    deleteSkillTemplate,
    isDeleting: mutation.isPending,
  };
}
