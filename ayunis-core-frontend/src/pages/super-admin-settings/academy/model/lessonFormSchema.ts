import * as z from 'zod';

// Mirrors the backend DTO validation (CreateLessonRequestDto)
const LOOM_URL_PATTERN =
  /^https:\/\/(www\.)?loom\.com\/(share|embed)\/[A-Za-z0-9]+/;

export function createLessonFormSchema(t: (key: string) => string) {
  return z.object({
    title: z
      .string()
      .min(1, t('lessonForm.titleRequired'))
      .max(255, t('lessonForm.titleTooLong')),
    description: z.string().max(2000, t('lessonForm.descriptionTooLong')),
    loomUrl: z
      .string()
      .min(1, t('lessonForm.loomUrlRequired'))
      .max(500, t('lessonForm.loomUrlTooLong'))
      .regex(LOOM_URL_PATTERN, t('lessonForm.loomUrlInvalid')),
  });
}

export type LessonFormValues = z.infer<
  ReturnType<typeof createLessonFormSchema>
>;
