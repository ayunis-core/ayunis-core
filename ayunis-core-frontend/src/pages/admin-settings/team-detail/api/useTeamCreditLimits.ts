import { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  useCreditLimitsControllerGetTeamLimits,
  useCreditLimitsControllerSetTeamLimit,
  useCreditLimitsControllerRemoveTeamLimit,
  getCreditLimitsControllerGetTeamLimitsQueryKey,
} from '@/shared/api';
import { showError, showSuccess } from '@/shared/lib/toast';
import extractErrorData from '@/shared/api/extract-error-data';

export interface CreditLimitInfo {
  monthlyCredits: number;
  creditsUsed: number;
}

export function useTeamCreditLimits(onSetSuccess?: () => void) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { t } = useTranslation('admin-settings-credit-limits');
  const { data, isLoading } = useCreditLimitsControllerGetTeamLimits();

  const teamLimits = useMemo(
    () =>
      new Map<string, CreditLimitInfo>(
        (data ?? []).map((team) => [
          team.teamId,
          {
            monthlyCredits: team.monthlyCredits,
            creditsUsed: team.creditsUsed,
          },
        ]),
      ),
    [data],
  );

  const invalidate = () => {
    void queryClient.invalidateQueries({
      queryKey: getCreditLimitsControllerGetTeamLimitsQueryKey(),
    });
    void router.invalidate();
  };

  const setMutation = useCreditLimitsControllerSetTeamLimit({
    mutation: {
      onSuccess: () => {
        showSuccess(t('creditLimits.set.success'));
        onSetSuccess?.();
      },
      onError: (error) => {
        try {
          const { code } = extractErrorData(error);
          if (code === 'TARGET_NOT_FOUND') {
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

  const removeMutation = useCreditLimitsControllerRemoveTeamLimit({
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

  function setTeamLimit(teamId: string, monthlyCredits: number) {
    setMutation.mutate({ teamId, data: { monthlyCredits } });
  }

  function removeTeamLimit(teamId: string) {
    removeMutation.mutate({ teamId });
  }

  return {
    teamLimits,
    isLoading,
    setTeamLimit,
    removeTeamLimit,
    isSaving: setMutation.isPending,
    isRemoving: removeMutation.isPending,
  };
}
