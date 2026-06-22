import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  useCreditLimitsControllerSetUserLimit,
  useCreditLimitsControllerSetTeamLimit,
  getCreditLimitsControllerGetOverviewQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import { showError, showSuccess } from '@/shared/lib/toast';

export function useSetCreditLimit(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { t } = useTranslation('admin-settings-credit-limits');

  const mutationConfig = {
    mutation: {
      onSuccess: () => {
        showSuccess(t('creditLimits.set.success'));
        onSuccess?.();
      },
      onError: () => {
        showError(t('creditLimits.set.error'));
      },
      onSettled: () => {
        void queryClient.invalidateQueries({
          queryKey: getCreditLimitsControllerGetOverviewQueryKey(),
        });
        void router.invalidate();
      },
    },
  };

  const userMutation = useCreditLimitsControllerSetUserLimit(mutationConfig);
  const teamMutation = useCreditLimitsControllerSetTeamLimit(mutationConfig);

  function setUserLimit(userId: string, monthlyCredits: number) {
    userMutation.mutate({ userId, data: { monthlyCredits } });
  }

  function setTeamLimit(teamId: string, monthlyCredits: number) {
    teamMutation.mutate({ teamId, data: { monthlyCredits } });
  }

  return {
    setUserLimit,
    setTeamLimit,
    isSaving: userMutation.isPending || teamMutation.isPending,
  };
}
