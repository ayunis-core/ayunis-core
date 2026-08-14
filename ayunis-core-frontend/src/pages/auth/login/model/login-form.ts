import { z } from 'zod';

interface LoginFormMessages {
  emailInvalid: string;
  passwordRequired: string;
}

export function createLoginFormSchema(messages: LoginFormMessages) {
  return z.object({
    email: z.string().email({ message: messages.emailInvalid }),
    password: z.string().min(1, { message: messages.passwordRequired }),
  });
}

export type LoginFormFields = z.infer<ReturnType<typeof createLoginFormSchema>>;
