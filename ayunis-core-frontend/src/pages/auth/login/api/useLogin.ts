import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate } from '@tanstack/react-router';
import { useAuthenticationControllerLogin } from '@/shared/api/generated/ayunisCoreAPI';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError } from '@/shared/lib/toast';
import { useTranslation } from 'react-i18next';
import * as z from 'zod';

export function useLogin({ redirect }: { redirect?: string }) {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const loginMutation = useAuthenticationControllerLogin();

  const loginFormSchema = z.object({
    email: z.string().email({
      message: t('login.emailInvalid'),
    }),
    password: z.string().min(1, {
      message: t('login.passwordRequired'),
    }),
  });

  const form = useForm<z.infer<typeof loginFormSchema>>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = (values: z.infer<typeof loginFormSchema>) => {
    loginMutation.mutate(
      {
        data: {
          email: values.email,
          password: values.password,
        },
      },
      {
        onSuccess: () => {
          // With cookie-based auth, the backend automatically sets HTTP-only cookies
          void navigate({ to: redirect ?? '/chat' });
        },
        onError: (error) => {
          console.error('Login failed:', error);
          try {
            const { status, code } = extractErrorData(error);
            if (status === 401 || status === 403) {
              showError(t('login.error.invalidCredentials'));
            } else if (code === 'RATE_LIMIT_EXCEEDED') {
              showError(t('login.error.rateLimitExceeded'));
            } else {
              showError(t('login.error.unexpectedError'));
            }
          } catch {
            // Non-AxiosError (network failure, request cancellation, etc.)
            showError(t('login.error.unexpectedError'));
          }
        },
      },
    );
  };

  return {
    form,
    onSubmit,
    isLoading: loginMutation.isPending,
  };
}
