import { z } from 'zod';

const customFields = z.union([
  z.record(z.string(), z.unknown()),
  z.array(z.unknown()),
]);
export const customerLinkSchema = z.object({
  id: z.string().min(1),
  customFields,
});
export const customerSchema = customerLinkSchema.extend({
  companyName: z.string(),
  defaultAddress: z
    .object({
      companyName: z.string().nullable().optional(),
      street: z.string(),
      houseNumber: z.string(),
      zip: z.string(),
      city: z.string(),
      countryCode: z.string(),
      vatId: z.string().nullable().optional(),
    })
    .nullable(),
});
export const subscriptionSchema = z.object({
  id: z.string().min(1),
  customer: z.object({ id: z.string().min(1) }),
  status: z.string(),
  activatedAt: z.string().nullable(),
  cancelledAt: z.string().nullable(),
  cancellationDate: z.string().nullable(),
  contractDetails: z.object({
    contractStart: z.string().nullable(),
    contractEnd: z.string().nullable(),
  }),
  items: z.array(
    z.object({
      id: z.string().min(1),
      contractDetails: z.object({
        contractStart: z.string().nullable(),
        contractEnd: z.string().nullable(),
      }),
      currentMeasurementValue: z.object({ quantity: z.number() }).nullable(),
    }),
  ),
});
export const entitlementSchema = z.object({
  id: z.string().min(1),
  feature: z.object({ id: z.string().min(1) }),
  subscriptionItem: z.object({ id: z.string().min(1) }).nullable(),
  value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
  status: z.enum(['active', 'pending', 'disabled', 'expired']),
  validFrom: z.string().nullable(),
  validUntil: z.string().nullable(),
});
export const paginationSchema = z.object({
  totalItems: z.number().int().nonnegative(),
});

export const subscriptionSummarySchema = subscriptionSchema.omit({
  items: true,
});
