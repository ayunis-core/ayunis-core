import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/shadcn/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/shadcn/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/ui/shadcn/form';
import { Input } from '@/shared/ui/shadcn/input';
import { useAddSuperAdmin } from '../api/useAddSuperAdmin';

interface AddSuperAdminFormData {
  email: string;
}

export default function AddSuperAdminDialog() {
  const { t } = useTranslation('super-admin-settings-super-admins');
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<AddSuperAdminFormData>({
    defaultValues: { email: '' },
  });

  const { addSuperAdmin, isAdding: isLoading } = useAddSuperAdmin({
    onSuccessCallback: () => {
      setIsOpen(false);
      form.reset();
    },
  });

  function onSubmit(data: AddSuperAdminFormData) {
    addSuperAdmin({ email: data.email.trim() });
  }

  function handleOpenChange(open: boolean) {
    if (!open && !isLoading) {
      form.reset();
    }
    setIsOpen(open);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">{t('actions.addSuperAdmin')}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t('dialog.title')}</DialogTitle>
          <DialogDescription>{t('dialog.description')}</DialogDescription>
        </DialogHeader>
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
              rules={{
                required: t('dialog.emailRequired'),
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: t('dialog.emailInvalid'),
                },
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('dialog.emailLabel')}</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder={t('dialog.emailPlaceholder')}
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isLoading}
              >
                {t('dialog.cancel')}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? t('dialog.adding') : t('dialog.add')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
