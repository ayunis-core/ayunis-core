import {
  getSuperAdminSubscriptionsControllerGetSubscriptionQueryKey,
  useSuperAdminSubscriptionsControllerUpdateStartDate,
} from '@/shared/api';
import type { UpdateStartDateDto } from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';
import { setValidationErrors } from '@/shared/lib/set-validation-errors';
import { showError, showSuccess } from '@/shared/lib/toast';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import type { UseFormReturn } from 'react-hook-form';
import type { UpdateSubscriptionStartDateFormData } from '../model/types';

interface UseSuperAdminSubscriptionStartDateUpdateProps {
  orgId: string;
  form: UseFormReturn<UpdateSubscriptionStartDateFormData>;
  onSuccess?: () => void;
}

export default function useSuperAdminSubscriptionStartDateUpdate({
  orgId,
  form,
  onSuccess,
}: UseSuperAdminSubscriptionStartDateUpdateProps) {
  const { t } = useTranslation('super-admin-settings-org');
  const queryClient = useQueryClient();
  const router = useRouter();
  const { mutate, isPending } =
    useSuperAdminSubscriptionsControllerUpdateStartDate({
      mutation: {
        onSuccess: () => {
          showSuccess(t('subscription.updateStartDateSuccess'));
          onSuccess?.();
        },
        onError: (error) => {
          try {
            const { code, errors } = extractErrorData(error);
            if (code === 'VALIDATION_ERROR' && errors) {
              setValidationErrors(form, errors, t, 'subscription.validation');
              return;
            }

            switch (code) {
              case 'SUBSCRIPTION_NOT_FOUND':
                showError(
                  t('subscription.updateStartDateErrorSubscriptionNotFound'),
                );
                break;
              case 'SUBSCRIPTION_ALREADY_CANCELLED':
                showError(
                  t(
                    'subscription.updateStartDateErrorSubscriptionAlreadyCancelled',
                  ),
                );
                break;
              default:
                showError(t('subscription.updateStartDateErrorUnexpected'));
            }
          } catch {
            showError(t('subscription.updateStartDateErrorUnexpected'));
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

  function updateStartDate(data: UpdateStartDateDto) {
    mutate({ orgId, data });
  }

  return { updateStartDate, isPending };
}
