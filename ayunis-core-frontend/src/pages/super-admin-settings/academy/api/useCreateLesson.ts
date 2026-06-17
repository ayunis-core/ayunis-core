import { useQueryClient } from '@tanstack/react-query';
import type { UseFormReturn } from 'react-hook-form';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { showSuccess, showError } from '@/shared/lib/toast';
import {
  useSuperAdminAcademyLessonsControllerCreateLesson,
  getSuperAdminAcademyChaptersControllerGetChaptersQueryKey,
  type CreateLessonRequestDto,
} from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';
import { setValidationErrors } from '@/shared/lib/set-validation-errors';
import type { LessonFormValues } from '../model/lessonFormSchema';

export function useCreateLesson(
  form: UseFormReturn<LessonFormValues>,
  onSuccess?: () => void,
) {
  const { t } = useTranslation('super-admin-settings-academy');
  const queryClient = useQueryClient();
  const router = useRouter();
  const mutation = useSuperAdminAcademyLessonsControllerCreateLesson({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: getSuperAdminAcademyChaptersControllerGetChaptersQueryKey(),
        });
        showSuccess(t('toast.lessonCreateSuccess'));
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
            showError(t('toast.lessonCreateError'));
          }
        } catch {
          showError(t('toast.lessonCreateError'));
        }
      },
      onSettled: async () => {
        await router.invalidate();
      },
    },
  });

  function createLesson(chapterId: string, data: CreateLessonRequestDto) {
    mutation.mutate({ chapterId, data });
  }

  return {
    createLesson,
    isCreating: mutation.isPending,
  };
}
