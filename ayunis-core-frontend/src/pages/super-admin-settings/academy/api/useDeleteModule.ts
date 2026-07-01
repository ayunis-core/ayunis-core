import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { showSuccess, showError } from '@/shared/lib/toast';
import {
  useSuperAdminAcademyCourseModulesControllerDeleteCourseModule,
  getSuperAdminAcademyChaptersControllerGetChaptersQueryKey,
} from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';

export function useDeleteModule() {
  const { t } = useTranslation('super-admin-settings-academy');
  const queryClient = useQueryClient();
  const router = useRouter();
  const mutation =
    useSuperAdminAcademyCourseModulesControllerDeleteCourseModule({
      mutation: {
        onSuccess: async () => {
          await queryClient.invalidateQueries({
            queryKey:
              getSuperAdminAcademyChaptersControllerGetChaptersQueryKey(),
          });
          showSuccess(t('toast.moduleDeleteSuccess'));
        },
        onError: (error: unknown) => {
          try {
            const { code } = extractErrorData(error);
            if (code === 'COURSE_MODULE_NOT_FOUND') {
              showError(t('toast.moduleNotFound'));
            } else {
              showError(t('toast.moduleDeleteError'));
            }
          } catch {
            showError(t('toast.moduleDeleteError'));
          }
        },
        onSettled: async () => {
          await router.invalidate();
        },
      },
    });

  function deleteModule(id: string) {
    mutation.mutate({ id });
  }

  return {
    deleteModule,
    isDeleting: mutation.isPending,
  };
}
