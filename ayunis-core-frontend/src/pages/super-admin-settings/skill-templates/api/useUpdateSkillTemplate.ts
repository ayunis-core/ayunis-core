import { useQueryClient } from '@tanstack/react-query';
import { showSuccess, showError } from '@/shared/lib/toast';
import {
  useSuperAdminSkillTemplatesControllerUpdate,
  getSuperAdminSkillTemplatesControllerFindAllQueryKey,
  type UpdateSkillTemplateDto,
} from '@/shared/api';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import extractErrorData from '@/shared/api/extract-error-data';

export function useUpdateSkillTemplate(onSuccess?: () => void) {
  const { t } = useTranslation('super-admin-settings-skills');
  const queryClient = useQueryClient();
  const router = useRouter();
  const mutation = useSuperAdminSkillTemplatesControllerUpdate({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: getSuperAdminSkillTemplatesControllerFindAllQueryKey(),
        });
        showSuccess(t('toast.updateSuccess'));
        onSuccess?.();
      },
      onError: (error: unknown) => {
        console.error('Update skill template failed:', error);
        try {
          const { code } = extractErrorData(error);
          if (code === 'SKILL_TEMPLATE_NOT_FOUND') {
            showError(t('toast.notFound'));
          } else if (code === 'DUPLICATE_SKILL_TEMPLATE_NAME') {
            showError(t('toast.duplicateName'));
          } else {
            showError(t('toast.updateError'));
          }
        } catch {
          showError(t('toast.updateError'));
        }
      },
      onSettled: async () => {
        await router.invalidate();
      },
    },
  });

  async function updateSkillTemplate(id: string, data: UpdateSkillTemplateDto) {
    await mutation.mutateAsync({ id, data });
  }

  return { updateSkillTemplate };
}
