import {
  getSuperAdminSubscriptionsControllerGetSubscriptionQueryKey,
  useSuperAdminSubscriptionsControllerUpdateMonthlyCredits,
} from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError, showSuccess } from '@/shared/lib/toast';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

export default function useSuperAdminSubscriptionMonthlyCreditsUpdate(
  orgId: string,
) {
  const { t } = useTranslation('super-admin-settings-org');
  const queryClient = useQueryClient();
  const router = useRouter();
  const { mutate, isPending } =
    useSuperAdminSubscriptionsControllerUpdateMonthlyCredits({
      mutation: {
        onSuccess: () => {
          showSuccess(t('creditBudget.updateSuccess'));
        },
        onError: (error) => {
          try {
            const { code } = extractErrorData(error);
            switch (code) {
              case 'SUBSCRIPTION_NOT_FOUND':
                showError(t('creditBudget.updateErrorSubscriptionNotFound'));
                break;
              case 'INVALID_SUBSCRIPTION_TYPE':
                showError(t('creditBudget.updateErrorInvalidType'));
                break;
              case 'INVALID_SUBSCRIPTION_DATA':
                showError(t('creditBudget.updateErrorInvalidData'));
                break;
              default:
                showError(t('creditBudget.updateErrorUnexpected'));
            }
          } catch {
            // Non-AxiosError (network failure, request cancellation, etc.)
            showError(t('creditBudget.updateErrorUnexpected'));
          }
        },
        onSettled: () => {
          void queryClient.invalidateQueries({
            queryKey:
              getSuperAdminSubscriptionsControllerGetSubscriptionQueryKey(
                orgId,
              ),
          });
          void router.invalidate();
        },
      },
    });

  function updateMonthlyCredits(
    monthlyCredits: number,
    options?: { onSuccess?: () => void },
  ) {
    mutate(
      {
        orgId,
        data: {
          monthlyCredits,
        },
      },
      {
        onSuccess: () => {
          options?.onSuccess?.();
        },
      },
    );
  }

  return { updateMonthlyCredits, isPending };
}
