import * as z from 'zod';

export function createEditUserFormSchema(t: (key: string) => string) {
  return z.object({
    name: z.string().min(1, t('editUserDialog.nameRequired')),
    email: z
      .string()
      .min(1, t('editUserDialog.emailRequired'))
      .email(t('editUserDialog.emailInvalid')),
  });
}

export type EditUserFormValues = z.infer<
  ReturnType<typeof createEditUserFormSchema>
>;
