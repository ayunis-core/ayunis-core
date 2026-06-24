import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import type { AcademyChapterResponseDto } from '@/shared/api';
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
  createChapterFormSchema,
  type ChapterFormValues,
} from '../model/chapterFormSchema';
import { useCreateChapter } from '../api/useCreateChapter';
import { useUpdateChapter } from '../api/useUpdateChapter';

interface ChapterFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chapter: AcademyChapterResponseDto | null;
}

export function ChapterFormDialog({
  open,
  onOpenChange,
  chapter,
}: Readonly<ChapterFormDialogProps>) {
  const { t } = useTranslation('super-admin-settings-academy');
  const isEdit = chapter !== null;

  const form = useForm<ChapterFormValues>({
    resolver: zodResolver(createChapterFormSchema(t)),
    defaultValues: { title: '', description: '' },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        title: chapter?.title ?? '',
        description: chapter?.description ?? '',
      });
    }
  }, [open, chapter, form]);

  function close() {
    onOpenChange(false);
    form.reset();
  }

  const { createChapter, isCreating } = useCreateChapter(form, close);
  const { updateChapter, isUpdating } = useUpdateChapter(form, close);
  const isSubmitting = isCreating || isUpdating;

  function onSubmit(data: ChapterFormValues) {
    if (isEdit) {
      updateChapter(chapter.id, data);
    } else {
      createChapter(data);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t('chapterForm.editTitle') : t('chapterForm.createTitle')}
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
                  <FormLabel>{t('chapterForm.title')}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={t('chapterForm.titlePlaceholder')}
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
                  <FormLabel>{t('chapterForm.description')}</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder={t('chapterForm.descriptionPlaceholder')}
                      disabled={isSubmitting}
                      rows={4}
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
                {t('chapterForm.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? t('chapterForm.saving') : t('chapterForm.save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
