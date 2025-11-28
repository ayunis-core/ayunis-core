import {
  getSubscriptionsControllerGetSubscriptionQueryKey,
  useSubscriptionsControllerCreateSubscription,
} from '@/shared/api';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { showError, showSuccess } from '@/shared/lib/toast';
import extractErrorData from '@/shared/api/extract-error-data';
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

export default function useSubscriptionCreate() {
  const { t } = useTranslation('admin-settings-billing');
  const queryClient = useQueryClient();
  const router = useRouter();
  const form = useForm({
    resolver: zodResolver(
      z.object({
        companyName: z
          .string()
          .min(1, t('subscription.createErrorCompanyNameRequired')),
        subText: z.string().optional(),
        street: z.string().min(1, t('subscription.createErrorStreetRequired')),
        houseNumber: z
          .string()
          .min(1, t('subscription.createErrorHouseNumberRequired')),
        postalCode: z
          .string()
          .min(1, t('subscription.createErrorPostalCodeRequired')),
        city: z.string().min(1, t('subscription.createErrorCityRequired')),
        country: z
          .string()
          .min(1, t('subscription.createErrorCountryRequired')),
        vatNumber: z.string().optional(),
        noOfSeats: z.coerce
          .number()
          .min(1, t('subscription.createErrorNoOfSeatsRequired')),
      }),
    ),
    defaultValues: {
      companyName: '',
      subText: '',
      street: '',
      houseNumber: '',
      postalCode: '',
      city: '',
      country: '',
      vatNumber: '',
      noOfSeats: 5,
    },
  });

  const { mutate: createSubscription } =
    useSubscriptionsControllerCreateSubscription({
      mutation: {
        onSuccess: () => {
          form.reset();
          showSuccess(t('subscription.createSuccess'));
        },
        onError: (error) => {
          const { code } = extractErrorData(error);
          if (code === 'SUBSCRIPTION_ALREADY_EXISTS') {
            showError(t('subscription.createErrorAlreadyExists'));
          } else {
            showError(t('subscription.createErrorUnexpected'));
          }
        },
        onSettled: () => {
          form.reset();
          void queryClient.invalidateQueries({
            queryKey: getSubscriptionsControllerGetSubscriptionQueryKey(),
          });
          void router.invalidate();
        },
      },
    });

  const handleSubmit = form.handleSubmit((data) => {
    createSubscription({
      data,
    });
  });

  return { form, handleSubmit };
}
