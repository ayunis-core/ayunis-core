import { useSuperAdminSubscriptionsControllerUncancelSubscription } from '@/shared/api';
import { invalidateOrgSubscriptionQueries } from './invalidateOrgSubscriptionQueries';
import { useTranslation } from 'react-i18next';
import { showError, showSuccess } from '@/shared/lib/toast';
import extractErrorData from '@/shared/api/extract-error-data';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';

export default function useSuperAdminSubscriptionUncancel(orgId: string) {
  const { t } = useTranslation('super-admin-settings-org');
  const queryClient = useQueryClient();
  const router = useRouter();
  const { mutate: uncancelSubscription } =
    useSuperAdminSubscriptionsControllerUncancelSubscription({
      mutation: {
        onSuccess: () => {
          showSuccess(t('subscription.uncancelSuccess'));
        },
        onError: (error) => {
          try {
            const { code } = extractErrorData(error);
            switch (code) {
              case 'SUBSCRIPTION_NOT_FOUND':
                showError(t('subscription.uncancelErrorSubscriptionNotFound'));
                break;
              case 'SUBSCRIPTION_ACCESS_OVERLAP':
                showError(t('subscription.uncancelErrorAccessOverlap'));
                break;
              case 'MULTIPLE_ACTIVE_SUBSCRIPTIONS':
                showError(t('subscription.multipleActiveSubscriptions'));
                break;
              default:
                showError(t('subscription.uncancelError'));
            }
          } catch {
            // Non-AxiosError (network failure, request cancellation, etc.)
            showError(t('subscription.uncancelError'));
          }
        },
        onSettled: () => {
          invalidateOrgSubscriptionQueries(queryClient, router, orgId);
        },
      },
    });

  function handleUncancel() {
    uncancelSubscription({ orgId });
  }

  return { uncancelSubscription: handleUncancel };
}
