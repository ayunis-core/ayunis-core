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
import type { Invite } from '../model/openapi';
import { useInviteAccept } from '../api';
import { useTranslation } from 'react-i18next';
import { Label } from '@/shared/ui/shadcn/label';
import { Checkbox } from '@/shared/ui/shadcn/checkbox';

interface InviteAcceptPageProps {
  invite: Invite;
  inviteToken: string;
  isCloud: boolean;
}

export default function InviteAcceptPage({
  invite,
  inviteToken,
  isCloud,
}: InviteAcceptPageProps) {
  const { form, onSubmit, isLoading } = useInviteAccept(invite, inviteToken);
  const { t } = useTranslation('auth');

  return (
    <OnboardingLayout
      title={t('inviteAccept.title')}
      description={t('inviteAccept.description', { role: invite.role })}
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
                <FormLabel>{t('inviteAccept.email')}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('inviteAccept.emailPlaceholder')}
                    type="email"
                    disabled
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('inviteAccept.name')}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('inviteAccept.namePlaceholder')}
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
                <FormLabel>{t('inviteAccept.password')}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('inviteAccept.passwordPlaceholder')}
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
              name="hasAcceptedMarketing"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="hasAcceptedMarketing"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                      <Label
                        htmlFor="hasAcceptedMarketing"
                        className="block font-normal leading-5"
                      >
                        {t('inviteAccept.marketingAcceptanceDescription')}
                      </Label>
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />
          )}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading
              ? t('inviteAccept.acceptingInvitation')
              : t('inviteAccept.acceptInvitationButton')}
          </Button>
        </form>
      </Form>
    </OnboardingLayout>
  );
}
