import { Button } from '@/shared/ui/shadcn/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import type { User } from '../model/openapi';
import {
  createEditUserFormSchema,
  type EditUserFormValues,
} from '../model/editUserFormSchema';
import { useUserUpdate } from '../api/useUserUpdate';

interface EditUserDialogProps {
  user: User | null;
  onClose: () => void;
}

export default function EditUserDialog({
  user,
  onClose,
}: Readonly<EditUserDialogProps>) {
  const { t } = useTranslation('admin-settings-users');

  const form = useForm<EditUserFormValues>({
    resolver: zodResolver(createEditUserFormSchema(t)),
    defaultValues: {
      name: user?.name ?? '',
      email: user?.email ?? '',
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({ name: user.name, email: user.email });
    }
  }, [user, form]);

  const { updateUser, isLoading } = useUserUpdate({
    onSuccessCallback: onClose,
  });

  function onSubmit(values: EditUserFormValues) {
    if (!user) return;
    const payload: { name?: string; email?: string } = {};
    if (values.name !== user.name) payload.name = values.name;
    if (values.email !== user.email) payload.email = values.email;
    if (Object.keys(payload).length === 0) {
      onClose();
      return;
    }
    updateUser({ id: user.id, data: payload });
  }

  function handleOpenChange(open: boolean) {
    if (!open) onClose();
  }

  return (
    <Dialog open={user !== null} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>{t('editUserDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('editUserDialog.description')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('editUserDialog.nameLabel')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('editUserDialog.namePlaceholder')}
                      autoComplete="name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('editUserDialog.emailLabel')}</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      autoComplete="email"
                      placeholder={t('editUserDialog.emailPlaceholder')}
                      {...field}
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
                onClick={onClose}
                disabled={isLoading}
              >
                {t('editUserDialog.cancel')}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading
                  ? t('editUserDialog.saving')
                  : t('editUserDialog.save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
