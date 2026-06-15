import { useQueryClient } from '@tanstack/react-query';
import type { UseFormReturn } from 'react-hook-form';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { showSuccess, showError } from '@/shared/lib/toast';
import {
  useSuperAdminAcademyLessonsControllerUpdateLesson,
  getSuperAdminAcademyChaptersControllerGetChaptersQueryKey,
  type UpdateLessonRequestDto,
} from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';
import { setValidationErrors } from '@/shared/lib/set-validation-errors';
import type { LessonFormValues } from '../model/lessonFormSchema';

export function useUpdateLesson(
  form: UseFormReturn<LessonFormValues>,
  onSuccess?: () => void,
) {
  const { t } = useTranslation('super-admin-settings-academy');
  const queryClient = useQueryClient();
  const router = useRouter();
  const mutation = useSuperAdminAcademyLessonsControllerUpdateLesson({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: getSuperAdminAcademyChaptersControllerGetChaptersQueryKey(),
        });
        showSuccess(t('toast.lessonUpdateSuccess'));
        onSuccess?.();
      },
      onError: (error: unknown) => {
        try {
          const { code, errors } = extractErrorData(error);
          if (code === 'VALIDATION_ERROR' && errors) {
            setValidationErrors(form, errors, t, 'validation');
          } else if (code === 'LESSON_NOT_FOUND') {
            showError(t('toast.lessonNotFound'));
          } else {
            showError(t('toast.lessonUpdateError'));
          }
        } catch {
          showError(t('toast.lessonUpdateError'));
        }
      },
      onSettled: async () => {
        await router.invalidate();
      },
    },
  });

  function updateLesson(id: string, data: UpdateLessonRequestDto) {
    mutation.mutate({ id, data });
  }

  return {
    updateLesson,
    isUpdating: mutation.isPending,
  };
}
