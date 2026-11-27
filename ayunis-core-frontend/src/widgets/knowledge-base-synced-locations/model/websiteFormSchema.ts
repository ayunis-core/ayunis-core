import * as z from 'zod';

export const WEBSITE_URL_MAX_LENGTH = 2048;
/** 0 = the page only, 1 = + linked pages, 2 = + their links. */
export const WEBSITE_DEPTH_OPTIONS = [0, 1, 2] as const;

function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

export function websiteFormSchema(t: (key: string) => string) {
  return z.object({
    url: z
      .string()
      .trim()
      .min(1, t('detail.syncedLocations.website.validation.url.isNotEmpty'))
      .max(
        WEBSITE_URL_MAX_LENGTH,
        t('detail.syncedLocations.website.validation.url.maxLength'),
      )
      .refine(
        isHttpUrl,
        t('detail.syncedLocations.website.validation.url.isUrl'),
      ),
    maxDepth: z.number().int().min(0).max(2),
  });
}

export type WebsiteFormValues = z.infer<ReturnType<typeof websiteFormSchema>>;
