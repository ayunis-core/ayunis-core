import { Button } from '@/shared/ui/shadcn/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/ui/shadcn/form';
import { Input } from '@/shared/ui/shadcn/input';
import OnboardingLayout from '@/layouts/onboarding-layout';
import { useRegister } from '../api';
import { useTranslation, Trans } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import { Checkbox } from '@/shared/ui/shadcn/checkbox';
import { Label } from '@/shared/ui/shadcn/label';
import { useGtm } from '@/features/useGtm';
import config from '@/shared/config';
import { Card, CardContent } from '@/shared/ui/shadcn/card';

interface RegisterPageProps {
  isCloud: boolean;
  isRegistrationDisabled: boolean;
}

export function RegisterPage({
  isCloud,
  isRegistrationDisabled,
}: RegisterPageProps) {
  const { form, onSubmit, isLoading } = useRegister();
  const { t } = useTranslation('auth');
  const agbHref = 'https://www.ayunis.com/agb-software-%c3%bcberlassung';
  const privacyPolicyRef = 'www.ayunis.com/datenschutz-core';
  const gtmContainerId = config.analytics.gtmContainerId ?? '';
  const usercentricsSettingsId = config.analytics.usercentricsSettingsId ?? '';
  const gtmEnabled =
    isCloud &&
    import.meta.env.PROD &&
    gtmContainerId !== '' &&
    usercentricsSettingsId !== '';

  useGtm({
    containerId: gtmContainerId,
    enabled: gtmEnabled,
    ucSettingsId: usercentricsSettingsId,
  });

  // Show registration closed message when cloud AND registration is disabled
  if (isCloud && isRegistrationDisabled) {
    return (
      <OnboardingLayout
        title={t('register.registrationClosedTitle')}
        description={t('register.registrationClosedDescription')}
        footer={
          <>
            {t('register.or')}{' '}
            <Link to="/login" className="font-medium text-primary underline">
              {t('register.signInExisting')}
            </Link>
          </>
        }
      >
        <Card>
          <CardContent className="text-center">
            <p className="text-muted-foreground font-medium">
              <a
                href={`mailto:${t('register.registrationClosedContact')}`}
                className="text-primary underline hover:no-underline"
              >
                {t('register.registrationClosedContact')}
              </a>
            </p>
          </CardContent>
        </Card>
      </OnboardingLayout>
    );
  }

  return (
    <OnboardingLayout
      title={t('register.title')}
      description={t('register.description')}
      footer={
        <>
          {t('register.or')} {''}
          <Link to="/login" className="font-medium text-primary underline">
            {t('register.signInExisting')}
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
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('register.email')}</FormLabel>
                <FormControl>
                  <Input
                    required
                    placeholder={t('register.emailPlaceholder')}
                    type="email"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="userName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('register.userName')}</FormLabel>
                <FormControl>
                  <Input
                    required
                    placeholder={t('register.userNamePlaceholder')}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="orgName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('register.orgName')}</FormLabel>
                <FormControl>
                  <Input
                    required
                    placeholder={t('register.orgNamePlaceholder')}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('register.password')}</FormLabel>
                <FormControl>
                  <Input
                    required
                    placeholder={t('register.passwordPlaceholder')}
                    type="password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {isCloud && (
            <FormField
              control={form.control}
              name="marketingAcceptance"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="marketingAcceptance"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                      <Label
                        htmlFor="marketingAcceptance"
                        className="block font-normal leading-5"
                      >
                        {t('register.marketingAcceptanceDescription')}
                      </Label>
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />
          )}
          {isCloud && (
            <FormField
              control={form.control}
              name="legalAcceptance"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="legalAcceptance"
                        required
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                      <Label
                        htmlFor="legalAcceptance"
                        className="block font-normal leading-5"
                      >
                        <Trans
                          i18nKey="register.legalAcceptanceDescription"
                          ns="auth"
                          components={{
                            privacyLink: (
                              <a
                                href={privacyPolicyRef}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline"
                              />
                            ),
                            tosLink: (
                              <a
                                href={agbHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline"
                              />
                            ),
                          }}
                        />
                      </Label>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading
              ? t('register.creatingAccount')
              : t('register.createAccountButton')}
          </Button>
        </form>
      </Form>
    </OnboardingLayout>
  );
}
