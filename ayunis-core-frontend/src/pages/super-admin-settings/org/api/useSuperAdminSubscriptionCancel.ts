import {
  getSuperAdminSubscriptionsControllerGetSubscriptionQueryKey,
  useSuperAdminSubscriptionsControllerCancelSubscription,
} from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError, showSuccess } from '@/shared/lib/toast';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

export default function useSuperAdminSubscriptionCancel(orgId: string) {
  const { t } = useTranslation('super-admin-settings-org');
  const queryClient = useQueryClient();
  const router = useRouter();
  const { mutate: cancelSubscription } =
    useSuperAdminSubscriptionsControllerCancelSubscription({
      mutation: {
        onSuccess: () => {
          showSuccess(t('subscription.cancelSuccess'));
        },
        onError: (error) => {
          try {
            const { code } = extractErrorData(error);
            if (code === 'SUBSCRIPTION_NOT_FOUND') {
              showError(t('subscription.cancelErrorSubscriptionNotFound'));
            } else {
              showError(t('subscription.cancelError'));
            }
          } catch {
            // Non-AxiosError (network failure, request cancellation, etc.)
            showError(t('subscription.cancelError'));
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

  function handleCancel() {
    cancelSubscription({ orgId });
  }

  return { cancelSubscription: handleCancel };
}
