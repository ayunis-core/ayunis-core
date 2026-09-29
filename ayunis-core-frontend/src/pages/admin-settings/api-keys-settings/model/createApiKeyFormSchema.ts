import * as z from 'zod';

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
      .refine((d) => d > new Date(), {
        message: t('apiKeys.createDialog.expiresInPast'),
      })
      .optional(),
  });
}

export type CreateApiKeyFormValues = z.infer<
  ReturnType<typeof createApiKeyFormSchema>
>;
