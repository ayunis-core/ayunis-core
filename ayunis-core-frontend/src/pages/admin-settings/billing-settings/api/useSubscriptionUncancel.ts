import {
  getSubscriptionsControllerGetSubscriptionQueryKey,
  useSubscriptionsControllerUncancelSubscription,
} from '@/shared/api';
import { useTranslation } from 'react-i18next';
import { showError, showSuccess } from '@/shared/lib/toast';
import extractErrorData from '@/shared/api/extract-error-data';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';

export default function useSubscriptionUncancel() {
  const { t } = useTranslation('admin-settings-billing');
  const queryClient = useQueryClient();
  const router = useRouter();
  const { mutate: uncancelSubscription } =
    useSubscriptionsControllerUncancelSubscription({
      mutation: {
        onSuccess: () => {
          showSuccess(t('subscription.uncancelSuccess'));
        },
        onError: (error) => {
          const { code } = extractErrorData(error);
          if (code === 'SUBSCRIPTION_NOT_FOUND') {
            showError(t('subscription.uncancelErrorSubscriptionNotFound'));
          } else {
            showError(t('subscription.uncancelError'));
          }
        },
        onSettled: () => {
          void queryClient.invalidateQueries({
            queryKey: getSubscriptionsControllerGetSubscriptionQueryKey(),
          });
          void router.invalidate();
        },
      },
    });

  return { uncancelSubscription };
}
