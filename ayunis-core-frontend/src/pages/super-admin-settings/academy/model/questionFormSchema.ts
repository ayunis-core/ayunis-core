import * as z from 'zod';

// Mirrors the backend DTO validation (CreateQuizQuestionRequestDto) plus the
// single-correct rule enforced in the use case (exactly one correct option).
export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 6;

export function createQuestionFormSchema(t: (key: string) => string) {
  return z
    .object({
      text: z
        .string()
        .min(1, t('questionForm.textRequired'))
        .max(2000, t('questionForm.textTooLong')),
      options: z
        .array(
          z.object({
            text: z
              .string()
              .min(1, t('questionForm.optionRequired'))
              .max(500, t('questionForm.optionTooLong')),
          }),
        )
        .min(MIN_OPTIONS, t('questionForm.tooFewOptions'))
        .max(MAX_OPTIONS, t('questionForm.tooManyOptions')),
      correctOptionIndex: z.number().int().min(0),
    })
    .refine((data) => data.correctOptionIndex < data.options.length, {
      message: t('questionForm.correctRequired'),
      path: ['correctOptionIndex'],
    });
}

export type QuestionFormValues = z.infer<
  ReturnType<typeof createQuestionFormSchema>
>;
