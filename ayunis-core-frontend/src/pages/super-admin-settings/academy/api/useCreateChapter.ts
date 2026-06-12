import { useQueryClient } from '@tanstack/react-query';
import type { UseFormReturn } from 'react-hook-form';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { showSuccess, showError } from '@/shared/lib/toast';
import {
  useSuperAdminAcademyChaptersControllerCreateChapter,
  getSuperAdminAcademyChaptersControllerGetChaptersQueryKey,
  type CreateChapterRequestDto,
} from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';
import { setValidationErrors } from '@/shared/lib/set-validation-errors';
import type { ChapterFormValues } from '../model/chapterFormSchema';

export function useCreateChapter(
  form: UseFormReturn<ChapterFormValues>,
  onSuccess?: () => void,
) {
  const { t } = useTranslation('super-admin-settings-academy');
  const queryClient = useQueryClient();
  const router = useRouter();
  const mutation = useSuperAdminAcademyChaptersControllerCreateChapter({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: getSuperAdminAcademyChaptersControllerGetChaptersQueryKey(),
        });
        showSuccess(t('toast.chapterCreateSuccess'));
        onSuccess?.();
      },
      onError: (error: unknown) => {
        try {
          const { code, errors } = extractErrorData(error);
          if (code === 'VALIDATION_ERROR' && errors) {
            setValidationErrors(form, errors, t, 'validation');
          } else {
            showError(t('toast.chapterCreateError'));
          }
        } catch {
          showError(t('toast.chapterCreateError'));
        }
      },
      onSettled: async () => {
        await router.invalidate();
      },
    },
  });

  function createChapter(data: CreateChapterRequestDto) {
    mutation.mutate({ data });
  }

  return {
    createChapter,
    isCreating: mutation.isPending,
  };
}
