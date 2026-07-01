import {
  getSuperAdminSubscriptionsControllerGetSubscriptionQueryKey,
  useSuperAdminSubscriptionsControllerCreateSubscription,
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

interface UseSuperAdminSubscriptionCreateProps {
  orgId: string;
}

export default function useSuperAdminSubscriptionCreate({
  orgId,
}: UseSuperAdminSubscriptionCreateProps) {
  const { t } = useTranslation('super-admin-settings-org');
  const queryClient = useQueryClient();
  const router = useRouter();
  const form = useForm<CreateSubscriptionFormData>({
    resolver: zodResolver(buildSubscriptionFormSchema(t)),
    defaultValues: subscriptionFormDefaultValues,
  });

  const { mutate: createSubscription } =
    useSuperAdminSubscriptionsControllerCreateSubscription({
      mutation: {
        onSuccess: () => {
          form.reset();
          showSuccess(t('subscription.createSuccess'));
        },
        onError: (error) => {
          try {
            const { code } = extractErrorData(error);
            switch (code) {
              case 'SUBSCRIPTION_ALREADY_EXISTS':
                showError(t('subscription.createErrorAlreadyExists'));
                break;
              case 'TOO_MANY_USED_SEATS':
                showError(t('subscription.createErrorTooManyUsedSeats'));
                break;
              default:
                showError(t('subscription.createErrorUnexpected'));
            }
          } catch {
            // Non-AxiosError (network failure, request cancellation, etc.)
            showError(t('subscription.createErrorUnexpected'));
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

  const handleSubmit = form.handleSubmit((data) => {
    createSubscription({
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
        noOfSeats: data.type === 'SEAT_BASED' ? data.noOfSeats : undefined,
        monthlyCredits:
          data.type === 'USAGE_BASED' ? data.monthlyCredits : undefined,
        startsAt: data.startsAt,
      },
    });
  });

  return { form, handleSubmit };
}
