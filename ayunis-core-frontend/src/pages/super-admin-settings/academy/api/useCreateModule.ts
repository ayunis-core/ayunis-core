import { useQueryClient } from '@tanstack/react-query';
import type { UseFormReturn } from 'react-hook-form';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { showSuccess, showError } from '@/shared/lib/toast';
import {
  useSuperAdminAcademyCourseModulesControllerCreateCourseModule,
  getSuperAdminAcademyChaptersControllerGetChaptersQueryKey,
  type CreateCourseModuleRequestDto,
} from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';
import { setValidationErrors } from '@/shared/lib/set-validation-errors';
import type { ModuleFormValues } from '../model/moduleFormSchema';

export function useCreateModule(
  form: UseFormReturn<ModuleFormValues>,
  onSuccess?: () => void,
) {
  const { t } = useTranslation('super-admin-settings-academy');
  const queryClient = useQueryClient();
  const router = useRouter();
  const mutation =
    useSuperAdminAcademyCourseModulesControllerCreateCourseModule({
      mutation: {
        onSuccess: async () => {
          await queryClient.invalidateQueries({
            queryKey:
              getSuperAdminAcademyChaptersControllerGetChaptersQueryKey(),
          });
          showSuccess(t('toast.moduleCreateSuccess'));
          onSuccess?.();
        },
        onError: (error: unknown) => {
          try {
            const { code, errors } = extractErrorData(error);
            if (code === 'VALIDATION_ERROR' && errors) {
              setValidationErrors(form, errors, t, 'validation');
            } else if (code === 'CHAPTER_NOT_FOUND') {
              showError(t('toast.chapterNotFound'));
            } else {
              showError(t('toast.moduleCreateError'));
            }
          } catch {
            showError(t('toast.moduleCreateError'));
          }
        },
        onSettled: async () => {
          await router.invalidate();
        },
      },
    });

  function createModule(chapterId: string, data: CreateCourseModuleRequestDto) {
    mutation.mutate({ chapterId, data });
  }

  return {
    createModule,
    isCreating: mutation.isPending,
  };
}
