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
import { Textarea } from '@/shared/ui/shadcn/textarea';
import { Button } from '@/shared/ui/shadcn/button';
import { useState, useEffect } from 'react';
import type { Prompt } from '../model/openapi';
import { useEditPrompt } from '../api/useEditPrompt';
import { useTranslation } from 'react-i18next';

interface EditPromptDialogProps {
  trigger: React.ReactNode;
  selectedPrompt: Prompt;
}

export default function EditPromptDialog({
  trigger,
  selectedPrompt,
}: EditPromptDialogProps) {
  const { t } = useTranslation('prompts');
  const [isOpen, setIsOpen] = useState(false);
  const { form, onSubmit, isLoading } = useEditPrompt({
    onSuccessCallback: () => {
      setIsOpen(false);
    },
  });

  // Set form values when dialog opens or selectedPrompt changes
  useEffect(() => {
    if (selectedPrompt && isOpen) {
      form.reset({
        id: selectedPrompt.id,
        title: selectedPrompt.title,
        content: selectedPrompt.content,
      });
    }
  }, [selectedPrompt, isOpen, form]);

  const handleCancel = () => {
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>{t('editDialog.title')}</DialogTitle>
          <DialogDescription>{t('editDialog.description')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={(e) => {
              void form.handleSubmit(onSubmit)(e);
            }}
            className="space-y-6"
          >
            <input type="hidden" {...form.register('id')} />
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('editDialog.form.titleLabel')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('editDialog.form.titlePlaceholder')}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('editDialog.form.contentLabel')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('editDialog.form.contentPlaceholder')}
                      className="min-h-[300px] resize-none"
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
                onClick={handleCancel}
                disabled={isLoading}
              >
                {t('editDialog.buttons.cancel')}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading
                  ? t('editDialog.buttons.saving')
                  : t('editDialog.buttons.save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
