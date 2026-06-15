import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import type { AcademyLessonResponseDto } from '@/shared/api';
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
  createLessonFormSchema,
  type LessonFormValues,
} from '../model/lessonFormSchema';
import { useCreateLesson } from '../api/useCreateLesson';
import { useUpdateLesson } from '../api/useUpdateLesson';

interface LessonFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chapterId: string | null;
  lesson: AcademyLessonResponseDto | null;
}

export function LessonFormDialog({
  open,
  onOpenChange,
  chapterId,
  lesson,
}: Readonly<LessonFormDialogProps>) {
  const { t } = useTranslation('super-admin-settings-academy');
  const isEdit = lesson !== null;

  const form = useForm<LessonFormValues>({
    resolver: zodResolver(createLessonFormSchema(t)),
    defaultValues: { title: '', description: '', loomUrl: '' },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        title: lesson?.title ?? '',
        description: lesson?.description ?? '',
        loomUrl: lesson?.loomUrl ?? '',
      });
    }
  }, [open, lesson, form]);

  function close() {
    onOpenChange(false);
    form.reset();
  }

  const { createLesson, isCreating } = useCreateLesson(form, close);
  const { updateLesson, isUpdating } = useUpdateLesson(form, close);
  const isSubmitting = isCreating || isUpdating;

  function onSubmit(data: LessonFormValues) {
    if (isEdit) {
      updateLesson(lesson.id, {
        title: data.title,
        description: data.description,
        loomUrl: data.loomUrl,
      });
    } else if (chapterId) {
      createLesson(chapterId, {
        title: data.title,
        description: data.description === '' ? undefined : data.description,
        loomUrl: data.loomUrl,
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t('lessonForm.editTitle') : t('lessonForm.createTitle')}
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
                  <FormLabel>{t('lessonForm.title')}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={t('lessonForm.titlePlaceholder')}
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
                  <FormLabel>{t('lessonForm.description')}</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder={t('lessonForm.descriptionPlaceholder')}
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
                  <FormLabel>{t('lessonForm.loomUrl')}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={t('lessonForm.loomUrlPlaceholder')}
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
                {t('lessonForm.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? t('lessonForm.saving') : t('lessonForm.save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
