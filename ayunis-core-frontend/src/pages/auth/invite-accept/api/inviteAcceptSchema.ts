import * as z from "zod";

export const inviteAcceptFormSchema = z
  .object({
    email: z.string().email(),
    name: z.string().min(1, {
      message: "Name is required",
    }),
    password: z.string().min(8, {
      message: "Password must be at least 8 characters.",
    }),
    confirmPassword: z.string().min(8, {
      message: "Password confirmation must be at least 8 characters.",
    }),
    inviteToken: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export type InviteAcceptFormValues = z.infer<typeof inviteAcceptFormSchema>;
