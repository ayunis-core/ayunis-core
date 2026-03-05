import { useQueryClient } from '@tanstack/react-query';
import { showSuccess, showError } from '@/shared/lib/toast';
import {
  useSuperAdminSkillTemplatesControllerCreate,
  getSuperAdminSkillTemplatesControllerFindAllQueryKey,
  type CreateSkillTemplateDto,
} from '@/shared/api';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import extractErrorData from '@/shared/api/extract-error-data';

export function useCreateSkillTemplate(onSuccess?: () => void) {
  const { t } = useTranslation('super-admin-settings-skills');
  const queryClient = useQueryClient();
  const router = useRouter();
  const mutation = useSuperAdminSkillTemplatesControllerCreate({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: getSuperAdminSkillTemplatesControllerFindAllQueryKey(),
        });
        showSuccess(t('toast.createSuccess'));
        onSuccess?.();
      },
      onError: (error: unknown) => {
        console.error('Create skill template failed:', error);
        try {
          const { code } = extractErrorData(error);
          if (code === 'DUPLICATE_SKILL_TEMPLATE_NAME') {
            showError(t('toast.duplicateName'));
          } else {
            showError(t('toast.createError'));
          }
        } catch {
          showError(t('toast.createError'));
        }
      },
      onSettled: async () => {
        await router.invalidate();
      },
    },
  });

  function createSkillTemplate(data: CreateSkillTemplateDto) {
    mutation.mutate({ data });
  }

  return {
    createSkillTemplate,
    isCreating: mutation.isPending,
  };
}
