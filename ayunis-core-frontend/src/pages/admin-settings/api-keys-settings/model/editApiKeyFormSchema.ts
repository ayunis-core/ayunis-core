import * as z from 'zod';

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
  });
}

export type EditApiKeyFormValues = z.infer<
  ReturnType<typeof editApiKeyFormSchema>
>;
