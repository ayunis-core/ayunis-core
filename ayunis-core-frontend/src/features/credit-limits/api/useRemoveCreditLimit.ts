import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  useCreditLimitsControllerRemoveUserLimit,
  useCreditLimitsControllerRemoveTeamLimit,
  getCreditLimitsControllerGetOverviewQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import { showError, showSuccess } from '@/shared/lib/toast';

export function useRemoveCreditLimit() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { t } = useTranslation('admin-settings-credit-limits');

  const mutationConfig = {
    mutation: {
      onSuccess: () => {
        showSuccess(t('creditLimits.remove.success'));
      },
      onError: () => {
        showError(t('creditLimits.remove.error'));
      },
      onSettled: () => {
        void queryClient.invalidateQueries({
          queryKey: getCreditLimitsControllerGetOverviewQueryKey(),
        });
        void router.invalidate();
      },
    },
  };

  const userMutation = useCreditLimitsControllerRemoveUserLimit(mutationConfig);
  const teamMutation = useCreditLimitsControllerRemoveTeamLimit(mutationConfig);

  function removeUserLimit(userId: string) {
    userMutation.mutate({ userId });
  }

  function removeTeamLimit(teamId: string) {
    teamMutation.mutate({ teamId });
  }

  return {
    removeUserLimit,
    removeTeamLimit,
    isRemoving: userMutation.isPending || teamMutation.isPending,
  };
}
