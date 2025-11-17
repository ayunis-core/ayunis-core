import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate } from '@tanstack/react-router';
import { showError, showSuccess } from '@/shared/lib/toast';
import { useTranslation } from 'react-i18next';
import { useUserControllerForgotPassword } from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';
import * as z from 'zod';

export function useForgotPassword() {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();

  const forgotPasswordFormSchema = z.object({
    email: z.string().email({
      message: t('forgotPassword.emailInvalid'),
    }),
  });

  const form = useForm<z.infer<typeof forgotPasswordFormSchema>>({
    resolver: zodResolver(forgotPasswordFormSchema),
    defaultValues: {
      email: '',
    },
  });

  const { mutate: forgotPassword, isPending } = useUserControllerForgotPassword(
    {
      mutation: {
        onSuccess: () => {
          showSuccess(t('forgotPassword.success'));
          void navigate({ to: '/login' });
        },
        onError: (error) => {
          const { code } = extractErrorData(error);
          switch (code) {
            default:
              showError(t('forgotPassword.error'));
          }
        },
      },
    },
  );

  function onSubmit(values: z.infer<typeof forgotPasswordFormSchema>) {
    forgotPassword({
      data: {
        email: values.email,
      },
    });
  }

  return {
    form,
    onSubmit,
    isLoading: isPending,
  };
}
