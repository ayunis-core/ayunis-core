import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import type { UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  getRoutinesControllerFindAllQueryKey,
  useRoutinesControllerCreate,
} from '@/shared/api/generated/ayunisCoreAPI';
import extractErrorData from '@/shared/api/extract-error-data';
import { setValidationErrors } from '@/shared/lib/set-validation-errors';
import { showError, showSuccess } from '@/shared/lib/toast';
import type { CreateRoutineDto, RoutineFormFields } from '@/features/routines';

export function useCreateRoutine(
  form: UseFormReturn<RoutineFormFields>,
  onSuccess?: () => void,
) {
  const { t } = useTranslation('routines');
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const mutation = useRoutinesControllerCreate({
    mutation: {
      onSuccess: (routine) => {
        void queryClient.invalidateQueries({
          queryKey: getRoutinesControllerFindAllQueryKey(),
        });
        showSuccess(t('toast.createSuccess'));
        onSuccess?.();
        void navigate({
          to: '/routines/$routineId',
          params: { routineId: routine.id },
        });
      },
      onError: (error: unknown) => {
        try {
          const { code, errors } = extractErrorData(error);
          switch (code) {
            case 'VALIDATION_ERROR':
              if (errors) setValidationErrors(form, errors, t, 'validation');
              else showError(t('toast.createError'));
              break;
            case 'UNAUTHORIZED_ACCESS':
            case 'MODEL_NOT_FOUND':
              showError(t('toast.modelUnavailable'));
              break;
            default:
              showError(t('toast.createError'));
          }
        } catch {
          showError(t('toast.createError'));
        }
      },
    },
  });

  return {
    createRoutine: (data: CreateRoutineDto) => mutation.mutate({ data }),
    isCreating: mutation.isPending,
  };
}
