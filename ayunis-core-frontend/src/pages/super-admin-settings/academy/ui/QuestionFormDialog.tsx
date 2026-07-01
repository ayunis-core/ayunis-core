import { useEffect } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import type { QuizQuestionResponseDto } from '@/shared/api';
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
  createQuestionFormSchema,
  MAX_OPTIONS,
  MIN_OPTIONS,
  type QuestionFormValues,
} from '../model/questionFormSchema';
import { useCreateQuestion } from '../api/useCreateQuestion';
import { useUpdateQuestion } from '../api/useUpdateQuestion';

interface QuestionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chapterId: string;
  question: QuizQuestionResponseDto | null;
}

const EMPTY_OPTIONS = [{ text: '' }, { text: '' }];

function toFormValues(
  question: QuizQuestionResponseDto | null,
): QuestionFormValues {
  if (!question) {
    return { text: '', options: EMPTY_OPTIONS, correctOptionIndex: 0 };
  }
  const correctIndex = question.options.findIndex((o) => o.isCorrect);
  return {
    text: question.text,
    options: question.options.map((o) => ({ text: o.text })),
    correctOptionIndex: correctIndex < 0 ? 0 : correctIndex,
  };
}

export function QuestionFormDialog({
  open,
  onOpenChange,
  chapterId,
  question,
}: Readonly<QuestionFormDialogProps>) {
  const { t } = useTranslation('super-admin-settings-academy');
  const isEdit = question !== null;

  const form = useForm<QuestionFormValues>({
    resolver: zodResolver(createQuestionFormSchema(t)),
    defaultValues: toFormValues(null),
  });
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'options',
  });
  const correctOptionIndex = useWatch({
    control: form.control,
    name: 'correctOptionIndex',
  });

  useEffect(() => {
    if (open) {
      form.reset(toFormValues(question));
    }
  }, [open, question, form]);

  function close() {
    onOpenChange(false);
    form.reset(toFormValues(null));
  }

  const { createQuestion, isCreating } = useCreateQuestion(form, close);
  const { updateQuestion, isUpdating } = useUpdateQuestion(form, close);
  const isSubmitting = isCreating || isUpdating;

  function removeOption(index: number) {
    remove(index);
    if (index === correctOptionIndex) {
      form.setValue('correctOptionIndex', 0);
    } else if (index < correctOptionIndex) {
      form.setValue('correctOptionIndex', correctOptionIndex - 1);
    }
  }

  function onSubmit(data: QuestionFormValues) {
    const payload = {
      text: data.text,
      options: data.options.map((option, index) => ({
        text: option.text,
        isCorrect: index === data.correctOptionIndex,
      })),
    };
    if (isEdit) {
      updateQuestion(question.id, payload);
    } else {
      createQuestion(chapterId, payload);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? t('questionForm.editTitle')
              : t('questionForm.createTitle')}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('questionForm.text')}</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder={t('questionForm.textPlaceholder')}
                      disabled={isSubmitting}
                      rows={2}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>{t('questionForm.options')}</FormLabel>
              <p className="text-xs text-muted-foreground">
                {t('questionForm.optionsHint')}
              </p>
              {fields.map((fieldItem, index) => (
                <FormField
                  key={fieldItem.id}
                  control={form.control}
                  name={`options.${index}.text`}
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="correctOption"
                          className="h-4 w-4 shrink-0"
                          aria-label={t('questionForm.markCorrect')}
                          checked={correctOptionIndex === index}
                          disabled={isSubmitting}
                          onChange={() =>
                            form.setValue('correctOptionIndex', index, {
                              shouldValidate: true,
                            })
                          }
                        />
                        <FormControl>
                          <Input
                            {...field}
                            placeholder={t('questionForm.optionPlaceholder', {
                              number: index + 1,
                            })}
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-destructive hover:text-destructive"
                          aria-label={t('questionForm.removeOption')}
                          disabled={
                            isSubmitting || fields.length <= MIN_OPTIONS
                          }
                          onClick={() => removeOption(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
              {form.formState.errors.correctOptionIndex && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.correctOptionIndex.message}
                </p>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isSubmitting || fields.length >= MAX_OPTIONS}
                onClick={() => append({ text: '' })}
              >
                <Plus className="h-4 w-4" />
                {t('questionForm.addOption')}
              </Button>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={close}
                disabled={isSubmitting}
              >
                {t('questionForm.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? t('questionForm.saving')
                  : t('questionForm.save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
