import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate } from '@tanstack/react-router';
import { useAuthenticationControllerRegister } from '@/shared/api/generated/ayunisCoreAPI';
import { showError } from '@/shared/lib/toast';
import extractErrorData from '@/shared/api/extract-error-data';
import { useTranslation } from 'react-i18next';
import * as z from 'zod';

export function useRegister() {
  const navigate = useNavigate();
  const { t } = useTranslation('auth');
  const registerMutation = useAuthenticationControllerRegister();

  const registerFormSchema = z.object({
    email: z.string().email({
      message: t('register.emailInvalid'),
    }),
    password: z.string().min(8, {
      message: t('register.passwordTooShort'),
    }),
    orgName: z.string().min(1, {
      message: t('register.orgNameRequired'),
    }),
    userName: z.string().min(1, {
      message: t('register.userNameRequired'),
    }),
    legalAcceptance: z.boolean(),
    marketingAcceptance: z.boolean(),
  });

  const form = useForm<z.infer<typeof registerFormSchema>>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      email: '',
      password: '',
      orgName: '',
      userName: '',
      legalAcceptance: false,
      marketingAcceptance: false,
    },
  });

  function onSubmit(values: z.infer<typeof registerFormSchema>) {
    registerMutation.mutate(
      {
        data: {
          email: values.email,
          password: values.password,
          orgName: values.orgName,
          userName: values.userName,
          marketingAcceptance: values.marketingAcceptance,
        },
      },
      {
        onSuccess: () => {
          void navigate({ to: '/email-confirm' });
        },
        onError: (error) => {
          console.error('Registration failed:', error);
          try {
            const { code } = extractErrorData(error);
            switch (code) {
              case 'USER_ALREADY_EXISTS':
                showError(t('register.emailAlreadyExists'));
                break;
              case 'INVALID_PASSWORD':
                showError(t('register.invalidPassword'));
                break;
              case 'USER_EMAIL_PROVIDER_BLACKLISTED':
                showError(t('register.emailProviderBlacklisted'));
                break;
              case 'REGISTRATION_DISABLED':
                showError(t('register.registrationDisabled'));
                break;
              case 'MARKETING_ACCEPTANCE_REQUIRED':
                showError(t('register.marketingAcceptanceRequired'));
                break;
              default:
                showError(t('register.registrationFailed'));
            }
          } catch {
            // Non-AxiosError (network failure, request cancellation, etc.)
            showError(t('register.registrationFailed'));
          }
        },
      },
    );
  }

  return {
    form,
    onSubmit,
    isLoading: registerMutation.isPending,
  };
}
