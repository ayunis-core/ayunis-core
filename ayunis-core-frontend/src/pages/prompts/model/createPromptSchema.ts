import * as z from 'zod';

export const createPromptFormSchema = z.object({
  title: z.string().min(1, {
    message: 'Title is required.',
  }),
  content: z.string().min(1, {
    message: 'Content is required.',
  }),
});

export type CreatePromptFormValues = z.infer<typeof createPromptFormSchema>;
