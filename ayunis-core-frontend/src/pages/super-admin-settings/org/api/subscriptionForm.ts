import { z } from 'zod';
import type { CreateSubscriptionFormData } from '@/widgets/billing';

const subscriptionTypes = ['SEAT_BASED', 'USAGE_BASED'] as const;

/**
 * Shared zod schema for the super-admin subscription forms (create and change).
 * Field-required messages come from the `super-admin-settings-org` namespace.
 */
export function buildSubscriptionFormSchema(t: (key: string) => string) {
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
      startsAt: z.string().optional(),
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

export const subscriptionFormDefaultValues: CreateSubscriptionFormData = {
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
  startsAt: undefined,
};
