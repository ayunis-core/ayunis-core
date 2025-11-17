import { z } from 'zod';

export const updatePasswordFormSchema = z
  .object({
    currentPassword: z
      .string()
      .min(8, 'Current password must be at least 8 characters'),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters'),
    newPasswordConfirmation: z
      .string()
      .min(8, 'Password confirmation must be at least 8 characters'),
  })
  .refine((data) => data.newPassword === data.newPasswordConfirmation, {
    message: "Passwords don't match",
    path: ['newPasswordConfirmation'],
  });

export type UpdatePasswordFormValues = z.infer<typeof updatePasswordFormSchema>;
