import {
  CreateSubscriptionRequestDtoType,
  getSuperAdminSubscriptionsControllerGetSubscriptionQueryKey,
  useSuperAdminSubscriptionsControllerCreateSubscription,
} from '@/shared/api';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { showError, showSuccess } from '@/shared/lib/toast';
import extractErrorData from '@/shared/api/extract-error-data';
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import type { CreateSubscriptionFormData } from '@/widgets/billing';

interface UseSuperAdminSubscriptionCreateProps {
  orgId: string;
}

const subscriptionTypes = [
  CreateSubscriptionRequestDtoType.SEAT_BASED,
  CreateSubscriptionRequestDtoType.USAGE_BASED,
] as const;

function buildSchema(t: (key: string) => string) {
  return z
    .object({
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
      country: z.string().min(1, t('subscription.createErrorCountryRequired')),
      vatNumber: z.string().optional(),
      type: z.enum(subscriptionTypes),
      noOfSeats: z.coerce.number().optional(),
      monthlyCredits: z.coerce.number().optional(),
    })
    .superRefine((data, ctx) => {
      if (
        data.type === 'SEAT_BASED' &&
        (!data.noOfSeats || data.noOfSeats < 1)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t('subscription.createErrorNoOfSeatsRequired'),
          path: ['noOfSeats'],
        });
      }
      if (
        data.type === 'USAGE_BASED' &&
        (!data.monthlyCredits || data.monthlyCredits < 1)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t('subscription.createErrorMonthlyCreditsRequired'),
          path: ['monthlyCredits'],
        });
      }
    });
}

export default function useSuperAdminSubscriptionCreate({
  orgId,
}: UseSuperAdminSubscriptionCreateProps) {
  const { t } = useTranslation('super-admin-settings-org');
  const queryClient = useQueryClient();
  const router = useRouter();
  const form = useForm<CreateSubscriptionFormData>({
    resolver: zodResolver(buildSchema(t)),
    defaultValues: {
      companyName: '',
      subText: '',
      street: '',
      houseNumber: '',
      postalCode: '',
      city: '',
      country: '',
      vatNumber: '',
      type: 'SEAT_BASED',
      noOfSeats: 5,
      monthlyCredits: 1000,
    },
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
      },
    });
  });

  return { form, handleSubmit };
}
