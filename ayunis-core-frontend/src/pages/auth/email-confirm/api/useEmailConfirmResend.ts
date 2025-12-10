import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useUserControllerResendEmailConfirmation } from '@/shared/api/generated/ayunisCoreAPI';
import * as z from 'zod';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError } from '@/shared/lib/toast';
import { useTranslation } from 'react-i18next';

export function useEmailConfirmResend() {
  const resendEmailMutation = useUserControllerResendEmailConfirmation();
  const { t } = useTranslation('auth');
  const emailConfirmFormSchema = z.object({
    email: z.string().email({
      message: t('emailConfirm.emailPlaceholder'),
    }),
  });
  type EmailConfirmFormValues = z.infer<typeof emailConfirmFormSchema>;

  const form = useForm<EmailConfirmFormValues>({
    resolver: zodResolver(emailConfirmFormSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = (values: EmailConfirmFormValues) => {
    resendEmailMutation.mutate(
      {
        data: {
          email: values.email,
        },
      },
      {
        onSuccess: () => {
          form.reset();
        },
        onError: (error) => {
          try {
            const { code } = extractErrorData(error);
            switch (code) {
              case 'RATE_LIMIT_EXCEEDED':
                showError(t('emailConfirm.rateLimitExceeded'));
                break;
              default:
                showError(t('emailConfirm.error'));
                break;
            }
          } catch {
            // Non-AxiosError (network failure, request cancellation, etc.)
            showError(t('emailConfirm.error'));
          }
        },
      },
    );
  };

  return {
    form,
    onSubmit,
    isLoading: resendEmailMutation.isPending,
    isSuccess: resendEmailMutation.isSuccess,
  };
}
