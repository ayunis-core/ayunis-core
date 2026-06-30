import type { ChangeSubscriptionRequestDtoOldSubscriptionDisposition } from '@/shared/api';
import {
  getSuperAdminSubscriptionsControllerGetSubscriptionQueryKey,
  useSuperAdminSubscriptionsControllerChangeSubscription,
} from '@/shared/api';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { showError, showSuccess } from '@/shared/lib/toast';
import extractErrorData from '@/shared/api/extract-error-data';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import type { CreateSubscriptionFormData } from '@/widgets/billing';
import {
  buildSubscriptionFormSchema,
  subscriptionFormDefaultValues,
} from './subscriptionForm';

interface UseSuperAdminSubscriptionChangeProps {
  orgId: string;
  onSuccess?: () => void;
}

export default function useSuperAdminSubscriptionChange({
  orgId,
  onSuccess,
}: UseSuperAdminSubscriptionChangeProps) {
  const { t } = useTranslation('super-admin-settings-org');
  const queryClient = useQueryClient();
  const router = useRouter();
  const form = useForm<CreateSubscriptionFormData>({
    resolver: zodResolver(buildSubscriptionFormSchema(t)),
    defaultValues: subscriptionFormDefaultValues,
  });

  const { mutate: changeSubscription, isPending } =
    useSuperAdminSubscriptionsControllerChangeSubscription({
      mutation: {
        onSuccess: () => {
          showSuccess(t('subscription.changeSuccess'));
          onSuccess?.();
        },
        onError: (error) => {
          try {
            const { code } = extractErrorData(error);
            switch (code) {
              case 'SUBSCRIPTION_NOT_FOUND':
                showError(t('subscription.changeErrorSubscriptionNotFound'));
                break;
              case 'TOO_MANY_USED_SEATS':
                showError(t('subscription.changeErrorTooManyUsedSeats'));
                break;
              default:
                showError(t('subscription.changeErrorUnexpected'));
            }
          } catch {
            showError(t('subscription.changeErrorUnexpected'));
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

  const confirmChange = (
    disposition: ChangeSubscriptionRequestDtoOldSubscriptionDisposition,
  ) => {
    const data = form.getValues();
    changeSubscription({
      orgId,
      data: {
        companyName: data.companyName,
        subText: data.subText,
        street: data.street,
        houseNumber: data.houseNumber,
        postalCode: data.postalCode,
        city: data.city,
        country: data.country,
        vatNumber: data.vatNumber,
        type: data.type,
        // form.getValues() returns raw RHF state; the number inputs hold
        // strings, so coerce them (the create flow gets these already coerced
        // from handleSubmit's zod-resolved data, but the change flow reads raw
        // values because the disposition is picked in a second dialog).
        noOfSeats:
          data.type === 'SEAT_BASED' ? Number(data.noOfSeats) : undefined,
        monthlyCredits:
          data.type === 'USAGE_BASED' ? Number(data.monthlyCredits) : undefined,
        startsAt: data.startsAt,
        oldSubscriptionDisposition: disposition,
      },
    });
  };

  return { form, confirmChange, isPending };
}
