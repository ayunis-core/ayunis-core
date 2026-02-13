import { z } from 'zod';

export const systemPromptFormSchema = z.object({
  systemPrompt: z
    .string()
    .max(10000, 'System prompt must be less than 10000 characters'),
});

export type SystemPromptFormValues = z.infer<typeof systemPromptFormSchema>;
