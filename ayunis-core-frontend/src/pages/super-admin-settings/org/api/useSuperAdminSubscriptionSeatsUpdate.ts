import {
  getSuperAdminSubscriptionsControllerGetSubscriptionQueryKey,
  useSuperAdminSubscriptionsControllerUpdateSeats,
} from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError, showSuccess } from '@/shared/lib/toast';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

export default function useSuperAdminSubscriptionSeatsUpdate(orgId: string) {
  const { t } = useTranslation('super-admin-settings-org');
  const queryClient = useQueryClient();
  const router = useRouter();
  const { mutate, isPending } = useSuperAdminSubscriptionsControllerUpdateSeats(
    {
      mutation: {
        onSuccess: () => {
          showSuccess(t('licenseSeats.updateSeatsSuccess'));
        },
        onError: (error) => {
          try {
            const { code } = extractErrorData(error);
            switch (code) {
              case 'SUBSCRIPTION_NOT_FOUND':
                showError(t('licenseSeats.updateSeatsErrorSubscriptionNotFound'));
                break;
              case 'TOO_MANY_USED_SEATS':
                showError(t('licenseSeats.updateSeatsErrorTooManyUsedSeats'));
                break;
              case 'SUBSCRIPTION_ALREADY_CANCELLED':
                showError(
                  t('licenseSeats.updateSeatsErrorSubscriptionAlreadyCancelled'),
                );
                break;
              default:
                showError(t('licenseSeats.updateSeatsErrorUnexpectedError'));
            }
          } catch {
            // Non-AxiosError (network failure, request cancellation, etc.)
            showError(t('licenseSeats.updateSeatsErrorUnexpectedError'));
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
    },
  );

  function updateSeats(noOfSeats: number) {
    mutate({
      orgId,
      data: {
        noOfSeats,
      },
    });
  }

  return { updateSeats, isPending };
}
