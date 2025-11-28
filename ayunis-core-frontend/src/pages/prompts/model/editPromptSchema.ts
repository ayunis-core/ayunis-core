import * as z from 'zod';

export const editPromptFormSchema = z.object({
  id: z.string(),
  title: z.string().min(1, {
    message: 'Title is required.',
  }),
  content: z.string().min(1, {
    message: 'Content is required.',
  }),
});

export type EditPromptFormValues = z.infer<typeof editPromptFormSchema>;
