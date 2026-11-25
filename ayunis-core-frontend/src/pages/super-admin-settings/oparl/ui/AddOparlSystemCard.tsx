import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@ayunis/ui/components/form';
import { Input } from '@ayunis/ui/components/input';
import { useAddOparlSystem } from '@/pages/super-admin-settings/oparl/api/useAddOparlSystem';
import { createAddOparlSystemSchema } from '@/pages/super-admin-settings/oparl/model/createAddOparlSystemSchema';
import type { AddOparlSystemFormFields } from '@/pages/super-admin-settings/oparl/model/types';

export function AddOparlSystemCard() {
  const { t } = useTranslation('super-admin-settings-oparl');
  const form = useForm<AddOparlSystemFormFields>({
    resolver: zodResolver(createAddOparlSystemSchema(t)),
    defaultValues: { url: '' },
  });
  const { addSystem, isPending } = useAddOparlSystem(form);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('add.title')}</CardTitle>
        <CardDescription>{t('add.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={(e) => void form.handleSubmit(addSystem)(e)}
            className="flex items-start gap-2"
          >
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel className="sr-only">{t('add.urlLabel')}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="url"
                      placeholder={t('add.urlPlaceholder')}
                      disabled={isPending}
                      data-testid="oparl-add-url"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              disabled={isPending}
              data-testid="oparl-add-submit"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('add.submit')}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
