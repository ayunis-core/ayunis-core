import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import { Label } from '@ayunis/ui/components/label';
import { Input } from '@ayunis/ui/components/input';
import { Button } from '@ayunis/ui/components/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@ayunis/ui/components/form';
import { useTranslation } from 'react-i18next';
import { useUserNameUpdate } from '../api/useUserNameUpdate';

export function ProfileInformationCard({
  user,
}: Readonly<{
  user: { name: string; email: string };
}>) {
  const { t } = useTranslation('settings');
  const { form, onSubmit, isUpdating } = useUserNameUpdate(user.name);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('account.profileInformation')}</CardTitle>
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
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="full-name">
                    {t('account.fullName')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      id="full-name"
                      type="text"
                      placeholder={t('account.fullNamePlaceholder')}
                      {...field}
                    />
                  </FormControl>
                  <p className="text-sm text-muted-foreground">
                    {t('account.fullNameDescription')}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-2">
              <Label htmlFor="email">{t('account.emailAddress')}</Label>
              <Input
                id="email"
                type="email"
                disabled
                placeholder={t('account.emailPlaceholder')}
                defaultValue={user.email}
              />
              <p className="text-sm text-muted-foreground">
                {t('account.emailDescription')}
              </p>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? t('account.saving') : t('account.saveChanges')}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
