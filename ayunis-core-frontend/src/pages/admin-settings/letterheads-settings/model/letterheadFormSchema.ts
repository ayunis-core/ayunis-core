import * as z from 'zod';

export function createLetterheadFormSchema(t: (key: string) => string) {
  return z.object({
    name: z.string().min(1, t('letterheads.createDialog.nameRequired')),
    description: z.string().optional(),
  });
}

export type LetterheadFormValues = z.infer<
  ReturnType<typeof createLetterheadFormSchema>
>;
