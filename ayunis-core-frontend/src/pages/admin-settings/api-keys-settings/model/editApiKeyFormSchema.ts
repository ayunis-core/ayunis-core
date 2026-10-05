import * as z from 'zod';
import { toEndOfLocalDay } from '@/pages/admin-settings/api-keys-settings/lib/to-end-of-local-day';

export const API_KEY_DESCRIPTION_MAX_LENGTH = 500;

export function editApiKeyFormSchema(t: (key: string) => string) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(1, t('apiKeys.editDialog.nameRequired'))
      .max(100, t('apiKeys.editDialog.nameTooLong')),
    description: z
      .string()
      .trim()
      .max(
        API_KEY_DESCRIPTION_MAX_LENGTH,
        t('apiKeys.editDialog.descriptionTooLong'),
      ),
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

export type EditApiKeyFormValues = z.infer<
  ReturnType<typeof editApiKeyFormSchema>
>;
