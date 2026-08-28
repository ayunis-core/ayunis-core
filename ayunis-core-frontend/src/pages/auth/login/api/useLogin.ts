import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate } from '@tanstack/react-router';
import { useAuthenticationControllerLogin } from '@/shared/api/generated/ayunisCoreAPI';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError } from '@/shared/lib/toast';
import { safeRedirectPath } from '@/shared/lib/safe-redirect-path';
import { useTranslation } from 'react-i18next';
import {
  createLoginFormSchema,
  type LoginFormFields,
} from '@/pages/auth/login/model/login-form';
import { forgetRememberedSsoOrgId } from '@/features/sso';

export function useLogin({ redirect }: { redirect?: string }) {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const loginMutation = useAuthenticationControllerLogin();

  const loginFormSchema = createLoginFormSchema({
    emailInvalid: t('login.emailInvalid'),
    passwordRequired: t('login.passwordRequired'),
  });

  const form = useForm<LoginFormFields>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = (values: LoginFormFields) => {
    loginMutation.mutate(
      {
        data: {
          email: values.email,
          password: values.password,
        },
      },
      {
        onSuccess: (data) => {
          forgetRememberedSsoOrgId();
          if (data.mfaRequired) {
            // No session yet — only the short-lived MFA pending cookie is
            // set. The two-factor page completes the login.
            void navigate({
              to: '/two-factor',
              search: {
                redirect,
                enroll: data.enrollmentRequired || undefined,
              },
            });
            return;
          }
          // With cookie-based auth, the backend automatically sets HTTP-only cookies
          void navigate({ to: safeRedirectPath(redirect) });
        },
        onError: (error) => {
          try {
            const { status, code } = extractErrorData(error);
            if (code === 'IP_NOT_ALLOWED') {
              void navigate({ to: '/ip-blocked' });
              return;
            } else if (status === 401 || status === 403) {
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
