import { useQueryClient } from '@tanstack/react-query';
import type { UseFormReturn } from 'react-hook-form';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { showSuccess, showError } from '@/shared/lib/toast';
import {
  useSuperAdminAcademyCourseModulesControllerUpdateCourseModule,
  getSuperAdminAcademyChaptersControllerGetChaptersQueryKey,
  type UpdateCourseModuleRequestDto,
} from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';
import { setValidationErrors } from '@/shared/lib/set-validation-errors';
import type { ModuleFormValues } from '../model/moduleFormSchema';

export function useUpdateModule(
  form: UseFormReturn<ModuleFormValues>,
  onSuccess?: () => void,
) {
  const { t } = useTranslation('super-admin-settings-academy');
  const queryClient = useQueryClient();
  const router = useRouter();
  const mutation =
    useSuperAdminAcademyCourseModulesControllerUpdateCourseModule({
      mutation: {
        onSuccess: async () => {
          await queryClient.invalidateQueries({
            queryKey:
              getSuperAdminAcademyChaptersControllerGetChaptersQueryKey(),
          });
          showSuccess(t('toast.moduleUpdateSuccess'));
          onSuccess?.();
        },
        onError: (error: unknown) => {
          try {
            const { code, errors } = extractErrorData(error);
            if (code === 'VALIDATION_ERROR' && errors) {
              setValidationErrors(form, errors, t, 'validation');
            } else if (code === 'COURSE_MODULE_NOT_FOUND') {
              showError(t('toast.moduleNotFound'));
            } else {
              showError(t('toast.moduleUpdateError'));
            }
          } catch {
            showError(t('toast.moduleUpdateError'));
          }
        },
        onSettled: async () => {
          await router.invalidate();
        },
      },
    });

  function updateModule(id: string, data: UpdateCourseModuleRequestDto) {
    mutation.mutate({ id, data });
  }

  return {
    updateModule,
    isUpdating: mutation.isPending,
  };
}
