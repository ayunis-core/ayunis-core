import { useQueryClient } from '@tanstack/react-query';
import type { UseFormReturn } from 'react-hook-form';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { showSuccess, showError } from '@/shared/lib/toast';
import {
  useSuperAdminAcademyChaptersControllerUpdateChapter,
  getSuperAdminAcademyChaptersControllerGetChaptersQueryKey,
  type UpdateChapterRequestDto,
} from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';
import { setValidationErrors } from '@/shared/lib/set-validation-errors';
import type { ChapterFormValues } from '../model/chapterFormSchema';

export function useUpdateChapter(
  form: UseFormReturn<ChapterFormValues>,
  onSuccess?: () => void,
) {
  const { t } = useTranslation('super-admin-settings-academy');
  const queryClient = useQueryClient();
  const router = useRouter();
  const mutation = useSuperAdminAcademyChaptersControllerUpdateChapter({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: getSuperAdminAcademyChaptersControllerGetChaptersQueryKey(),
        });
        showSuccess(t('toast.chapterUpdateSuccess'));
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
            showError(t('toast.chapterUpdateError'));
          }
        } catch {
          showError(t('toast.chapterUpdateError'));
        }
      },
      onSettled: async () => {
        await router.invalidate();
      },
    },
  });

  function updateChapter(id: string, data: UpdateChapterRequestDto) {
    mutation.mutate({ id, data });
  }

  return {
    updateChapter,
    isUpdating: mutation.isPending,
  };
}
