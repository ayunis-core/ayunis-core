import * as z from 'zod';

// Mirrors the backend DTO validation (CreateCourseModuleRequestDto)
const LOOM_URL_PATTERN =
  /^https:\/\/(www\.)?loom\.com\/(share|embed)\/[A-Za-z0-9]+/;

export function createModuleFormSchema(t: (key: string) => string) {
  return z.object({
    title: z
      .string()
      .min(1, t('moduleForm.titleRequired'))
      .max(255, t('moduleForm.titleTooLong')),
    description: z.string().max(2000, t('moduleForm.descriptionTooLong')),
    loomUrl: z
      .string()
      .min(1, t('moduleForm.loomUrlRequired'))
      .max(500, t('moduleForm.loomUrlTooLong'))
      .regex(LOOM_URL_PATTERN, t('moduleForm.loomUrlInvalid')),
  });
}

export type ModuleFormValues = z.infer<
  ReturnType<typeof createModuleFormSchema>
>;
