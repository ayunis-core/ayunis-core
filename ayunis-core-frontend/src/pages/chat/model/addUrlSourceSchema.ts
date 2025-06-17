import { z } from "zod";

export const addUrlSourceFormSchema = z.object({
  url: z.string().url("Please enter a valid URL"),
});

export type AddUrlSourceFormValues = z.infer<typeof addUrlSourceFormSchema>;
