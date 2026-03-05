import { useState } from 'react';
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
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const mutation = useSuperAdminSkillTemplatesControllerUpdate({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: getSuperAdminSkillTemplatesControllerFindAllQueryKey(),
        });
        showSuccess(t('toast.updateSuccess'));
        onSuccess?.();
      },
      onError: (error: unknown, variables) => {
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
        setUpdatingIds((prev) => {
          const next = new Set(prev);
          next.delete(variables.id);
          return next;
        });
      },
      onSettled: async (_, __, variables) => {
        setUpdatingIds((prev) => {
          const next = new Set(prev);
          next.delete(variables.id);
          return next;
        });
        await router.invalidate();
      },
    },
  });

  function updateSkillTemplate(id: string, data: UpdateSkillTemplateDto) {
    setUpdatingIds((prev) => new Set(prev).add(id));
    mutation.mutate({ id, data });
  }

  return {
    updateSkillTemplate,
    updatingIds,
  };
}
