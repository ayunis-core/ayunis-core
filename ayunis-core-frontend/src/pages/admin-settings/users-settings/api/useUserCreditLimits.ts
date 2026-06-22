import { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  useCreditLimitsControllerGetUserLimits,
  useCreditLimitsControllerSetUserLimit,
  useCreditLimitsControllerRemoveUserLimit,
  getCreditLimitsControllerGetUserLimitsQueryKey,
} from '@/shared/api';
import { showError, showSuccess } from '@/shared/lib/toast';
import extractErrorData from '@/shared/api/extract-error-data';

export interface CreditLimitInfo {
  monthlyCredits: number;
  creditsUsed: number;
}

export function useUserCreditLimits(onSetSuccess?: () => void) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { t } = useTranslation('admin-settings-credit-limits');
  const { data, isLoading } = useCreditLimitsControllerGetUserLimits();

  const userLimits = useMemo(
    () =>
      new Map<string, CreditLimitInfo>(
        (data ?? []).map((u) => [
          u.userId,
          { monthlyCredits: u.monthlyCredits, creditsUsed: u.creditsUsed },
        ]),
      ),
    [data],
  );

  const invalidate = () => {
    void queryClient.invalidateQueries({
      queryKey: getCreditLimitsControllerGetUserLimitsQueryKey(),
    });
    void router.invalidate();
  };

  const setMutation = useCreditLimitsControllerSetUserLimit({
    mutation: {
      onSuccess: () => {
        showSuccess(t('creditLimits.set.success'));
        onSetSuccess?.();
      },
      onError: (error) => {
        try {
          const { code } = extractErrorData(error);
          if (code === 'CREDIT_LIMIT_TARGET_NOT_FOUND') {
            showError(t('creditLimits.set.notFound'));
          } else if (code === 'INVALID_CREDIT_LIMIT') {
            showError(t('creditLimits.set.invalid'));
          } else {
            showError(t('creditLimits.set.error'));
          }
        } catch {
          showError(t('creditLimits.set.error'));
        }
      },
      onSettled: invalidate,
    },
  });

  const removeMutation = useCreditLimitsControllerRemoveUserLimit({
    mutation: {
      onSuccess: () => showSuccess(t('creditLimits.remove.success')),
      onError: (error) => {
        try {
          const { code } = extractErrorData(error);
          if (code === 'CREDIT_LIMIT_NOT_FOUND') {
            showError(t('creditLimits.remove.notFound'));
          } else {
            showError(t('creditLimits.remove.error'));
          }
        } catch {
          showError(t('creditLimits.remove.error'));
        }
      },
      onSettled: invalidate,
    },
  });

  function setUserLimit(userId: string, monthlyCredits: number) {
    setMutation.mutate({ userId, data: { monthlyCredits } });
  }

  function removeUserLimit(userId: string) {
    removeMutation.mutate({ userId });
  }

  return {
    userLimits,
    isLoading,
    setUserLimit,
    removeUserLimit,
    isSaving: setMutation.isPending,
    isRemoving: removeMutation.isPending,
  };
}
