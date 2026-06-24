import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate } from '@tanstack/react-router';
import { showError, showSuccess } from '@/shared/lib/toast';
import { useTranslation } from 'react-i18next';
import { useUserPasswordResetControllerResetPassword } from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';
import { passwordPolicySchema } from '@/shared/lib/password-policy';
import * as z from 'zod';

export function useResetPassword(token: string, mode: 'activation' | 'reset') {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const prefix = mode === 'activation' ? 'activateAccount' : 'resetPassword';

  const resetPasswordFormSchema = z
    .object({
      newPassword: passwordPolicySchema(t('passwordPolicy', { ns: 'common' })),
      confirmPassword: z.string().min(1, {
        message: t('resetPassword.passwordsDontMatch'),
      }),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: t('resetPassword.passwordsDontMatch'),
      path: ['confirmPassword'],
    });

  const form = useForm<z.infer<typeof resetPasswordFormSchema>>({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  });

  const { mutate: resetPassword, isPending } =
    useUserPasswordResetControllerResetPassword({
      mutation: {
        onSuccess: () => {
          showSuccess(t(`${prefix}.success`));
          void navigate({ to: '/login' });
        },
        onError: (error) => {
          try {
            const { code } = extractErrorData(error);
            switch (code) {
              case 'INVALID_TOKEN':
                showError(t(`${prefix}.invalidToken`));
                break;
              case 'INVALID_PASSWORD':
                showError(t(`${prefix}.invalidPassword`));
                break;
              default:
                showError(t(`${prefix}.error`));
            }
          } catch {
            // Non-AxiosError (network failure, request cancellation, etc.)
            showError(t(`${prefix}.error`));
          }
        },
      },
    });

  function onSubmit(values: z.infer<typeof resetPasswordFormSchema>) {
    resetPassword({
      data: {
        resetToken: token,
        newPassword: values.newPassword,
        newPasswordConfirmation: values.confirmPassword,
      },
    });
  }

  return {
    form,
    onSubmit,
    isLoading: isPending,
  };
}
