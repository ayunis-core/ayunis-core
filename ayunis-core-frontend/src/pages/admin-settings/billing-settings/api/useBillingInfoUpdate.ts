import {
  getSubscriptionsControllerGetSubscriptionQueryKey,
  useSubscriptionsControllerUpdateBillingInfo,
  type UpdateBillingInfoDto,
} from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError, showSuccess } from '@/shared/lib/toast';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

interface BillingInfoUpdateFormData {
  currentBillingInfo: UpdateBillingInfoDto;
}

export default function useBillingInfoUpdate({
  currentBillingInfo,
}: BillingInfoUpdateFormData) {
  const { t } = useTranslation('admin-settings-billing');
  const queryClient = useQueryClient();
  const router = useRouter();
  const form = useForm({
    resolver: zodResolver(
      z.object({
        companyName: z
          .string()
          .min(1, t('billingInfo.createErrorCompanyNameRequired')),
        street: z.string().min(1, t('billingInfo.createErrorStreetRequired')),
        houseNumber: z
          .string()
          .min(1, t('billingInfo.createErrorHouseNumberRequired')),
        postalCode: z
          .string()
          .min(1, t('billingInfo.createErrorPostalCodeRequired')),
        city: z.string().min(1, t('billingInfo.createErrorCityRequired')),
        country: z.string().min(1, t('billingInfo.createErrorCountryRequired')),
        vatNumber: z.string().optional(),
      }),
    ),
    defaultValues: {
      companyName: currentBillingInfo.companyName,
      street: currentBillingInfo.street,
      houseNumber: currentBillingInfo.houseNumber,
      postalCode: currentBillingInfo.postalCode,
      city: currentBillingInfo.city,
      country: currentBillingInfo.country,
      vatNumber: currentBillingInfo.vatNumber,
    },
  });

  const { mutate, isPending } = useSubscriptionsControllerUpdateBillingInfo({
    mutation: {
      onSuccess: () => {
        showSuccess(t('billingInfo.updateSuccess'));
      },
      onError: (error) => {
        try {
          const { code } = extractErrorData(error);
          if (code === 'SUBSCRIPTION_NOT_FOUND') {
            showError(t('billingInfo.updateErrorSubscriptionNotFound'));
          } else {
            showError(t('billingInfo.updateErrorUnexpected'));
          }
        } catch {
          // Non-AxiosError (network failure, request cancellation, etc.)
          showError(t('billingInfo.updateErrorUnexpected'));
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

  function updateBillingInfo(billingInfo: UpdateBillingInfoDto) {
    mutate({
      data: billingInfo,
    });
  }

  return { form, updateBillingInfo, isPending };
}
