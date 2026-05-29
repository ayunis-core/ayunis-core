import { z } from 'zod';
import type { TFunction } from 'i18next';
import { passwordPolicySchema } from '@/shared/lib/password-policy';

export function createUpdatePasswordSchema(t: TFunction) {
  return z
    .object({
      currentPassword: z.string().min(1, {
        message: t('account.error.currentPasswordRequired'),
      }),
      newPassword: passwordPolicySchema(t('passwordPolicy', { ns: 'common' })),
      newPasswordConfirmation: z.string().min(1, {
        message: t('account.passwordsDontMatch'),
      }),
    })
    .refine((data) => data.newPassword === data.newPasswordConfirmation, {
      message: t('account.passwordsDontMatch'),
      path: ['newPasswordConfirmation'],
    });
}

export type UpdatePasswordFormValues = z.infer<
  ReturnType<typeof createUpdatePasswordSchema>
>;
