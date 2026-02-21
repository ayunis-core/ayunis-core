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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/shadcn/select';
import { Checkbox } from '@/shared/ui/shadcn/checkbox';
import { Label } from '@/shared/ui/shadcn/label';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useSuperAdminCreateUser } from '../api/useSuperAdminCreateUser';
import { useTranslation } from 'react-i18next';
import type { CreateUserDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';

interface CreateUserDialogProps {
  orgId: string;
}

interface CreateUserFormData {
  email: string;
  name: string;
  role: CreateUserDto['role'];
  sendPasswordResetEmail: boolean;
}

export default function CreateUserDialog({
  orgId,
}: Readonly<CreateUserDialogProps>) {
  const { t } = useTranslation('super-admin-settings-org');
  const [isOpen, setIsOpen] = useState(false);
  const { createUser, isLoading } = useSuperAdminCreateUser({
    orgId,
    onSuccessCallback: () => {
      setIsOpen(false);
      form.reset();
    },
  });

  const form = useForm<CreateUserFormData>({
    defaultValues: {
      email: '',
      name: '',
      role: 'user',
      sendPasswordResetEmail: true,
    },
  });

  function onSubmit(data: CreateUserFormData) {
    createUser({
      email: data.email,
      name: data.name,
      role: data.role,
      sendPasswordResetEmail: data.sendPasswordResetEmail,
    });
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
        <Button size="sm">{t('createUser.button')}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('createUser.title')}</DialogTitle>
          <DialogDescription>{t('createUser.description')}</DialogDescription>
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
              name="name"
              rules={{
                required: t('createUser.nameRequired'),
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('createUser.nameLabel')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('createUser.namePlaceholder')}
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              rules={{
                required: t('createUser.emailRequired'),
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: t('createUser.emailInvalid'),
                },
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('createUser.emailLabel')}</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder={t('createUser.emailPlaceholder')}
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              rules={{
                required: t('createUser.roleRequired'),
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('createUser.roleLabel')}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t('createUser.rolePlaceholder')}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="user">
                        {t('createUser.roleUser')}
                      </SelectItem>
                      <SelectItem value="admin">
                        {t('createUser.roleAdmin')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sendPasswordResetEmail"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="sendPasswordResetEmail"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isLoading}
                      />
                      <Label
                        htmlFor="sendPasswordResetEmail"
                        className="block font-normal leading-5 cursor-pointer"
                      >
                        {t('createUser.sendPasswordResetEmailLabel')}
                      </Label>
                    </div>
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
                {t('createUser.cancel')}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? t('createUser.creating') : t('createUser.create')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
