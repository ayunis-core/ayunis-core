import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import { PasswordInput } from '@ayunis/ui/components/password-input';
import { Button } from '@ayunis/ui/components/button';
import { Separator } from '@ayunis/ui/components/separator';
import { useTranslation } from 'react-i18next';
import { usePasswordUpdate } from '../api/usePasswordUpdate';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@ayunis/ui/components/form';

export default function PasswordSettingsPage() {
  const { t } = useTranslation('settings');
  const { form, onSubmit, isUpdating } = usePasswordUpdate();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('account.password')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Form {...form}>
          <form
            onSubmit={(e) => {
              void form.handleSubmit(onSubmit)(e);
            }}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('account.currentPassword')}</FormLabel>
                  <FormControl>
                    <PasswordInput
                      {...field}
                      placeholder={t('account.currentPasswordPlaceholder')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('account.newPassword')}</FormLabel>
                  <FormControl>
                    <PasswordInput
                      {...field}
                      placeholder={t('account.newPasswordPlaceholder')}
                    />
                  </FormControl>
                  <p className="text-sm text-muted-foreground">
                    {t('account.newPasswordDescription')}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="newPasswordConfirmation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('account.confirmPassword')}</FormLabel>
                  <FormControl>
                    <PasswordInput
                      {...field}
                      placeholder={t('account.confirmPasswordPlaceholder')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end">
              <Button type="submit" disabled={isUpdating}>
                {isUpdating
                  ? t('account.changingPassword')
                  : t('account.changePassword')}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
