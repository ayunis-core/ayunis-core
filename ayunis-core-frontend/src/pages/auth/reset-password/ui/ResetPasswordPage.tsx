import { Button } from '@/shared/ui/shadcn/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/ui/shadcn/form';
import { PasswordInput } from '@/shared/ui/shadcn/password-input';
import OnboardingLayout from '@/layouts/onboarding-layout';
import { useResetPassword } from '../api/useResetPassword';
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';

interface Props {
  token: string;
  purpose: 'activation' | 'reset';
}

export function ResetPasswordPage({ token, purpose }: Readonly<Props>) {
  const { form, onSubmit, isLoading } = useResetPassword(token, purpose);
  const { t } = useTranslation('auth');
  const isActivation = purpose === 'activation';
  const prefix = isActivation ? 'activateAccount' : 'resetPassword';

  return (
    <OnboardingLayout
      title={t(`${prefix}.title`)}
      description={t(`${prefix}.description`)}
      footer={
        <>
          {t(`${prefix}.backToLogin`)}{' '}
          <Link
            to="/login"
            className="font-medium text-primary hover:underline"
          >
            {t(`${prefix}.signIn`)}
          </Link>
        </>
      }
    >
      <Form {...form}>
        <form
          onSubmit={(e) => {
            void form.handleSubmit(onSubmit)(e);
          }}
          className="space-y-4"
        >
          <FormField
            control={form.control}
            name="newPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t(`${prefix}.password`)}</FormLabel>
                <FormControl>
                  <PasswordInput
                    placeholder={t(`${prefix}.passwordPlaceholder`)}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t(`${prefix}.confirmPassword`)}</FormLabel>
                <FormControl>
                  <PasswordInput
                    placeholder={t(`${prefix}.confirmPasswordPlaceholder`)}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? t(`${prefix}.resetting`) : t(`${prefix}.submitButton`)}
          </Button>
        </form>
      </Form>
    </OnboardingLayout>
  );
}
