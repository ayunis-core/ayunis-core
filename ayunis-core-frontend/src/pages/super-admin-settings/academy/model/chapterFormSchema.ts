import * as z from 'zod';

export function createChapterFormSchema(t: (key: string) => string) {
  return z.object({
    title: z
      .string()
      .min(1, t('chapterForm.titleRequired'))
      .max(255, t('chapterForm.titleTooLong')),
    description: z
      .string()
      .min(1, t('chapterForm.descriptionRequired'))
      .max(2000, t('chapterForm.descriptionTooLong')),
  });
}

export type ChapterFormValues = z.infer<
  ReturnType<typeof createChapterFormSchema>
>;
