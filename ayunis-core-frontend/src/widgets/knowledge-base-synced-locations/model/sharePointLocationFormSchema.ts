import * as z from 'zod';

export const SHAREPOINT_URL_MAX_LENGTH = 2048;

export function sharePointLocationFormSchema(t: (key: string) => string) {
  return z.object({
    url: z
      .string()
      .trim()
      .min(1, t('detail.syncedLocations.validation.url.isNotEmpty'))
      .max(
        SHAREPOINT_URL_MAX_LENGTH,
        t('detail.syncedLocations.validation.url.maxLength'),
      ),
  });
}

export type SharePointLocationFormValues = z.infer<
  ReturnType<typeof sharePointLocationFormSchema>
>;
