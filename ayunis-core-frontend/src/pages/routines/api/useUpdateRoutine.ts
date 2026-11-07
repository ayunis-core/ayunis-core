import { useQueryClient } from '@tanstack/react-query';
import type { UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  getRoutinesControllerFindAllQueryKey,
  useRoutinesControllerUpdate,
} from '@/shared/api/generated/ayunisCoreAPI';
import extractErrorData from '@/shared/api/extract-error-data';
import { setValidationErrors } from '@/shared/lib/set-validation-errors';
import { showError, showSuccess } from '@/shared/lib/toast';
import type { UpdateRoutineDto } from '@/pages/routines/model/openapi';
import type { RoutineFormFields } from '@/pages/routines/model/types';

/** Without a form (the enable switch), validation errors become a toast. */
export function useUpdateRoutine(
  form?: UseFormReturn<RoutineFormFields>,
  onSuccess?: () => void,
) {
  const { t } = useTranslation('routines');
  const queryClient = useQueryClient();
  const mutation = useRoutinesControllerUpdate({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: getRoutinesControllerFindAllQueryKey(),
        });
        if (form) showSuccess(t('toast.updateSuccess'));
        onSuccess?.();
      },
      onError: (error: unknown) => {
        try {
          const { code, errors } = extractErrorData(error);
          switch (code) {
            case 'VALIDATION_ERROR':
              if (errors && form) {
                setValidationErrors(form, errors, t, 'validation');
              } else {
                showError(t('toast.updateError'));
              }
              break;
            case 'ROUTINE_NOT_FOUND':
              showError(t('toast.notFound'));
              break;
            case 'UNAUTHORIZED_ACCESS':
            case 'MODEL_NOT_FOUND':
              showError(t('toast.modelUnavailable'));
              break;
            default:
              showError(t('toast.updateError'));
          }
        } catch {
          showError(t('toast.updateError'));
        }
      },
    },
  });

  return {
    updateRoutine: (id: string, data: UpdateRoutineDto) =>
      mutation.mutate({ id, data }),
    isUpdating: mutation.isPending,
  };
}
