import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  creditLimitsControllerSetTeamLimit,
  creditLimitsControllerSetUserLimit,
  creditLimitsControllerRemoveTeamLimit,
  creditLimitsControllerRemoveUserLimit,
  getCreditLimitsControllerGetTeamLimitsQueryKey,
  getCreditLimitsControllerGetUserLimitsQueryKey,
} from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';
import { setValidationErrors } from '@/shared/lib/set-validation-errors';
import { showError, showSuccess } from '@/shared/lib/toast';
import type { CreditLimitTarget } from '@/features/credit-limits/model/credit-limit-settings';
import type { UseFormReturn } from 'react-hook-form';
import type { CreditLimitFields } from '@/widgets/credit-limit-editor/model/types';

export function useSaveCreditLimit(
  target: CreditLimitTarget,
  id: string,
  hasLimit: boolean,
) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { t } = useTranslation('admin-settings-credit-limits');
  const mutation = useMutation({
    mutationFn: async (value: number | null) => {
      if (value === null) {
        if (!hasLimit) return;
        return target === 'teams'
          ? creditLimitsControllerRemoveTeamLimit(id)
          : creditLimitsControllerRemoveUserLimit(id);
      }
      const data = { monthlyCredits: value };
      return target === 'teams'
        ? creditLimitsControllerSetTeamLimit(id, data)
        : creditLimitsControllerSetUserLimit(id, data);
    },
    onSuccess: async (_data, value) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: getCreditLimitsControllerGetTeamLimitsQueryKey(),
        }),
        queryClient.invalidateQueries({
          queryKey: getCreditLimitsControllerGetUserLimitsQueryKey(),
        }),
      ]);
      void router.invalidate();
      showSuccess(
        t(
          value === null
            ? 'creditLimits.remove.success'
            : 'creditLimits.set.success',
        ),
      );
    },
  });
  const onSave = async (
    value: number | null,
    form: UseFormReturn<CreditLimitFields>,
  ): Promise<boolean> => {
    const errorMessage = t(
      value === null ? 'creditLimits.remove.error' : 'creditLimits.set.error',
    );
    try {
      await mutation.mutateAsync(value);
      return true;
    } catch (error) {
      try {
        const { code, errors } = extractErrorData(error);
        if (code === 'VALIDATION_ERROR' && errors)
          setValidationErrors(form, errors, t, 'validation');
        else if (code === 'INVALID_CREDIT_LIMIT')
          form.setError('monthlyCredits', {
            message: t('validation.monthlyCredits.invalid'),
          });
        else if (code === 'CREDIT_LIMIT_TARGET_NOT_FOUND')
          showError(t('creditLimits.set.notFound'));
        else if (code === 'CREDIT_LIMIT_NOT_FOUND')
          showError(t('creditLimits.remove.notFound'));
        else showError(errorMessage);
      } catch {
        showError(errorMessage);
      }
      return false;
    }
  };
  return { onSave, isLoading: mutation.isPending };
}
