import * as z from 'zod';
import { toEndOfLocalDay } from '@/pages/admin-settings/api-keys-settings/lib/to-end-of-local-day';

export function createApiKeyFormSchema(t: (key: string) => string) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(1, t('apiKeys.createDialog.nameRequired'))
      .max(100, t('apiKeys.createDialog.nameTooLong')),
    description: z
      .string()
      .trim()
      .max(500, t('apiKeys.editDialog.descriptionTooLong')),
    expiresAt: z
      .date()
      // The picker allows today and yields local midnight; the key only
      // expires at the end of the chosen day, so compare that moment.
      .refine((d) => toEndOfLocalDay(d) > new Date(), {
        message: t('apiKeys.createDialog.expiresInPast'),
      })
      .optional(),
  });
}

export type CreateApiKeyFormValues = z.infer<
  ReturnType<typeof createApiKeyFormSchema>
>;
