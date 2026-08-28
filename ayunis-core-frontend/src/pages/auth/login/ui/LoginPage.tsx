import { Button } from '@ayunis/ui/components/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@ayunis/ui/components/form';
import { Input } from '@ayunis/ui/components/input';
import { PasswordInput } from '@ayunis/ui/components/password-input';
import OnboardingLayout from '@/layouts/onboarding-layout';
import { useLogin } from '@/pages/auth/login/api/useLogin';
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import { useRedirectNotification } from '@/features/useRedirectNotification';
import {
  beginSso,
  forgetRememberedSsoOrgId,
  getRememberedSsoOrgId,
  useDiscoverSso,
} from '@/features/sso';
import { useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { LoginFormFields } from '@/pages/auth/login/model/login-form';
import { showError } from '@/shared/lib/toast';

export function LoginPage({
  redirect,
  emailVerified,
  ssoLoginEnabled,
}: Readonly<{
  redirect?: string;
  emailVerified?: boolean;
  ssoLoginEnabled: boolean;
}>) {
  const { form, onSubmit, isLoading } = useLogin({ redirect });
  const { discover, isPending: isDiscovering } = useDiscoverSso();
  const { t } = useTranslation('auth');
  const [showMethods, setShowMethods] = useState(!ssoLoginEnabled);
  const [ssoOrgId, setSsoOrgId] = useState<string | null>(null);
  const [rememberedSsoOrgId, setRememberedSsoOrgId] = useState(() =>
    ssoLoginEnabled ? getRememberedSsoOrgId() : null,
  );
  const showRememberedSso = rememberedSsoOrgId !== null;

  useRedirectNotification({
    show: emailVerified ?? false,
    text: t('login.emailVerified'),
  });

  useRedirectNotification({
    show: !!redirect,
    text: t('login.redirect'),
  });

  async function continueWithEmail() {
    if (isDiscovering) return;
    if (!(await form.trigger('email'))) return;
    try {
      const result = await discover(form.getValues('email'));
      setSsoOrgId(result.available ? (result.orgId ?? null) : null);
    } catch {
      setSsoOrgId(null);
      showError(t('login.ssoDiscoveryFailed'));
    }
    setShowMethods(true);
  }

  function changeEmail() {
    form.resetField('password');
    setShowMethods(false);
    setSsoOrgId(null);
  }

  function useAnotherAccount() {
    forgetRememberedSsoOrgId();
    setRememberedSsoOrgId(null);
  }

  return (
    <OnboardingLayout
      title={t('login.title')}
      description={t(
        showRememberedSso
          ? 'login.rememberedSsoDescription'
          : 'login.description',
      )}
      footer={
        <>
          {t('login.noAccount')}{' '}
          <Link to="/register" className="font-medium text-primary underline">
            {t('login.createAccount')}
          </Link>
        </>
      }
    >
      {showRememberedSso ? (
        <RememberedSsoLogin
          orgId={rememberedSsoOrgId}
          redirect={redirect}
          onUseAnotherAccount={useAnotherAccount}
        />
      ) : (
        <Form {...form}>
          <form
            onSubmit={(e) => {
              if (ssoLoginEnabled && !showMethods) {
                e.preventDefault();
                void continueWithEmail();
                return;
              }
              void form.handleSubmit(onSubmit)(e);
            }}
            className="space-y-4"
          >
            <EmailField
              form={form}
              disabled={ssoLoginEnabled && (showMethods || isDiscovering)}
            />
            {showMethods ? (
              <LoginMethods
                form={form}
                ssoOrgId={ssoOrgId}
                redirect={redirect}
                isLoading={isLoading}
                onChangeEmail={changeEmail}
                showChangeEmail={ssoLoginEnabled}
              />
            ) : (
              <Button
                type="button"
                className="w-full"
                disabled={isDiscovering}
                onClick={() => void continueWithEmail()}
                data-testid="login-continue"
              >
                {isDiscovering ? t('login.checkingEmail') : t('login.continue')}
              </Button>
            )}
          </form>
        </Form>
      )}
    </OnboardingLayout>
  );
}

function RememberedSsoLogin({
  orgId,
  redirect,
  onUseAnotherAccount,
}: Readonly<{
  orgId: string;
  redirect?: string;
  onUseAnotherAccount: () => void;
}>) {
  const { t } = useTranslation('auth');
  return (
    <div className="space-y-2">
      <Button
        type="button"
        className="w-full"
        onClick={() => beginSso(orgId, redirect)}
        data-testid="login-remembered-sso"
      >
        {t('login.signInWithSso')}
      </Button>
      <Button
        type="button"
        variant="ghost"
        className="w-full"
        onClick={onUseAnotherAccount}
        data-testid="login-use-another-account"
      >
        {t('login.useAnotherAccount')}
      </Button>
    </div>
  );
}

function EmailField({
  form,
  disabled,
}: Readonly<{ form: UseFormReturn<LoginFormFields>; disabled: boolean }>) {
  const { t } = useTranslation('auth');
  return (
    <FormField
      control={form.control}
      name="email"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t('login.email')}</FormLabel>
          <FormControl>
            <Input
              placeholder={t('login.emailPlaceholder')}
              type="email"
              data-testid="email"
              disabled={disabled}
              {...field}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

interface LoginMethodsProps {
  form: UseFormReturn<LoginFormFields>;
  ssoOrgId: string | null;
  redirect?: string;
  isLoading: boolean;
  onChangeEmail: () => void;
  showChangeEmail: boolean;
}

function LoginMethods({
  form,
  ssoOrgId,
  redirect,
  isLoading,
  onChangeEmail,
  showChangeEmail,
}: Readonly<LoginMethodsProps>) {
  const { t } = useTranslation('auth');
  return (
    <>
      {showChangeEmail && (
        <Button
          type="button"
          variant="ghost"
          onClick={onChangeEmail}
          disabled={isLoading}
        >
          {t('login.changeEmail')}
        </Button>
      )}
      {ssoOrgId && (
        <>
          <Button
            type="button"
            className="w-full"
            disabled={isLoading}
            onClick={() => beginSso(ssoOrgId, redirect)}
          >
            {t('login.signInWithSso')}
          </Button>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            {t('login.orUsePassword')}
            <span className="h-px flex-1 bg-border" />
          </div>
        </>
      )}
      <PasswordField form={form} />
      <Button
        type="submit"
        className="w-full"
        disabled={isLoading}
        data-testid="submit"
      >
        {isLoading ? t('login.signingIn') : t('login.signInButton')}
      </Button>
    </>
  );
}

function PasswordField({
  form,
}: Readonly<{ form: UseFormReturn<LoginFormFields> }>) {
  const { t } = useTranslation('auth');
  return (
    <FormField
      control={form.control}
      name="password"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t('login.password')}</FormLabel>
          <FormControl>
            <PasswordInput
              placeholder={t('login.passwordPlaceholder')}
              data-testid="password"
              {...field}
            />
          </FormControl>
          <FormDescription>
            <Link
              to="/password/forgot"
              className="text-sm text-muted-foreground"
            >
              {t('login.forgotPassword')}
            </Link>
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
