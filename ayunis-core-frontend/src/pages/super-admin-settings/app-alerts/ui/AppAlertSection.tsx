import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Loader2 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';
import { Button } from '@/shared/ui/shadcn/button';
import { Switch } from '@/shared/ui/shadcn/switch';
import { Textarea } from '@/shared/ui/shadcn/textarea';
import { Alert, AlertDescription } from '@/shared/ui/shadcn/alert';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/ui/shadcn/form';
import useAppAlert from '../api/useAppAlert';
import useSetAppAlert from '../api/useSetAppAlert';
import { createAppAlertSchema } from '../model/createAppAlertSchema';
import type { AppAlertFormFields } from '../model/types';

export default function AppAlertSection() {
  const { t } = useTranslation('super-admin-settings-app-alerts');
  const { appAlert, isLoading, isError } = useAppAlert();

  const form = useForm<AppAlertFormFields>({
    resolver: zodResolver(createAppAlertSchema(t)),
    defaultValues: { enabled: false, message: '' },
    values: appAlert
      ? { enabled: appAlert.enabled, message: appAlert.message }
      : undefined,
    resetOptions: { keepDirtyValues: true },
  });
  const { setAppAlert, isPending } = useSetAppAlert(form);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('appAlert.title')}</CardTitle>
        <CardDescription>{t('appAlert.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        {isError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{t('appAlert.loadError')}</AlertDescription>
          </Alert>
        )}
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        )}
        {appAlert && !isError && (
          <Form {...form}>
            <form
              onSubmit={(e) => void form.handleSubmit(setAppAlert)(e)}
              className="space-y-6"
            >
              <FormField
                control={form.control}
                name="enabled"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <FormLabel>{t('appAlert.showAlertLabel')}</FormLabel>
                      <FormDescription>
                        {t('appAlert.showAlertDescription')}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isPending}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('appAlert.messageLabel')}</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder={t('appAlert.messagePlaceholder')}
                        maxLength={1000}
                        className="min-h-[100px]"
                        disabled={isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('appAlert.save')}
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}
