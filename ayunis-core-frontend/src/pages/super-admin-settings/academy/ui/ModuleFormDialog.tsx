import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import type { CourseModuleResponseDto } from '@/shared/api';
import {
  Dialog,
  DialogContent,
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
import { Textarea } from '@/shared/ui/shadcn/textarea';
import { Button } from '@/shared/ui/shadcn/button';
import {
  createModuleFormSchema,
  type ModuleFormValues,
} from '../model/moduleFormSchema';
import { useCreateModule } from '../api/useCreateModule';
import { useUpdateModule } from '../api/useUpdateModule';

interface ModuleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chapterId: string | null;
  module: CourseModuleResponseDto | null;
}

export function ModuleFormDialog({
  open,
  onOpenChange,
  chapterId,
  module,
}: Readonly<ModuleFormDialogProps>) {
  const { t } = useTranslation('super-admin-settings-academy');
  const isEdit = module !== null;

  const form = useForm<ModuleFormValues>({
    resolver: zodResolver(createModuleFormSchema(t)),
    defaultValues: { title: '', description: '', loomUrl: '' },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        title: module?.title ?? '',
        description: module?.description ?? '',
        loomUrl: module?.loomUrl ?? '',
      });
    }
  }, [open, module, form]);

  function close() {
    onOpenChange(false);
    form.reset();
  }

  const { createModule, isCreating } = useCreateModule(form, close);
  const { updateModule, isUpdating } = useUpdateModule(form, close);
  const isSubmitting = isCreating || isUpdating;

  function onSubmit(data: ModuleFormValues) {
    const payload = {
      title: data.title,
      description: data.description === '' ? undefined : data.description,
      loomUrl: data.loomUrl,
    };
    if (isEdit) {
      updateModule(module.id, payload);
    } else if (chapterId) {
      createModule(chapterId, payload);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t('moduleForm.editTitle') : t('moduleForm.createTitle')}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('moduleForm.title')}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={t('moduleForm.titlePlaceholder')}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('moduleForm.description')}</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder={t('moduleForm.descriptionPlaceholder')}
                      disabled={isSubmitting}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="loomUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('moduleForm.loomUrl')}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={t('moduleForm.loomUrlPlaceholder')}
                      disabled={isSubmitting}
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
                onClick={close}
                disabled={isSubmitting}
              >
                {t('moduleForm.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? t('moduleForm.saving') : t('moduleForm.save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
