import { z } from "zod";

export const updateUserNameFormSchema = z.object({
  name: z
    .string()
    .min(1, "Full name is required")
    .max(100, "Full name must be less than 100 characters"),
});

export type UpdateUserNameFormValues = z.infer<typeof updateUserNameFormSchema>;
