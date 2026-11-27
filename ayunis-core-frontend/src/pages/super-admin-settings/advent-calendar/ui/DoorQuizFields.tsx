import { useId } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Plus, X } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@ayunis/ui/components/form';
import { Input } from '@ayunis/ui/components/input';
import { Textarea } from '@ayunis/ui/components/textarea';
import { correctAnswerAfterRemoving } from '@/pages/super-admin-settings/advent-calendar/lib/door-form-values';
import {
  DOOR_QUIZ_ANSWER_MAX_LENGTH,
  DOOR_QUIZ_EXPLANATION_MAX_LENGTH,
  DOOR_QUIZ_MAX_ANSWERS,
  DOOR_QUIZ_MIN_ANSWERS,
  DOOR_QUIZ_QUESTION_MAX_LENGTH,
} from '@/pages/super-admin-settings/advent-calendar/model/constants';
import type { DoorFormFields } from '@/pages/super-admin-settings/advent-calendar/model/types';

interface DoorQuizFieldsProps {
  index: number;
  disabled: boolean;
}

export default function DoorQuizFields({
  index,
  disabled,
}: Readonly<DoorQuizFieldsProps>) {
  const { t } = useTranslation('super-admin-settings-advent-calendar');
  const radioName = useId();
  const form = useFormContext<DoorFormFields>();
  const correctPath = `buttons.${index}.correctAnswerIndex` as const;
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: `buttons.${index}.answers`,
  });
  const answersError =
    form.formState.errors.buttons?.[index]?.answers?.root?.message;

  function removeAnswer(answer: number) {
    const correct = form.getValues(correctPath);
    remove(answer);
    form.setValue(correctPath, correctAnswerAfterRemoving(correct, answer), {
      shouldDirty: true,
    });
  }

  return (
    <>
      <FormField
        control={form.control}
        name={`buttons.${index}.question`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('quiz.question')}</FormLabel>
            <FormControl>
              <Input
                {...field}
                maxLength={DOOR_QUIZ_QUESTION_MAX_LENGTH}
                disabled={disabled}
                data-testid="advent-calendar-quiz-question"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name={correctPath}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('quiz.answers')}</FormLabel>
            <FormDescription>{t('quiz.answersDescription')}</FormDescription>
            <div className="space-y-2">
              {fields.map((answer, answerIndex) => (
                <div key={answer.id} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={radioName}
                    className="size-4 shrink-0 accent-primary"
                    checked={field.value === answerIndex}
                    onChange={() => field.onChange(answerIndex)}
                    disabled={disabled}
                    aria-label={t('quiz.markCorrect', {
                      number: answerIndex + 1,
                    })}
                    data-testid={`advent-calendar-quiz-correct-${answerIndex}`}
                  />
                  <Input
                    {...form.register(
                      `buttons.${index}.answers.${answerIndex}.text`,
                    )}
                    maxLength={DOOR_QUIZ_ANSWER_MAX_LENGTH}
                    placeholder={t('quiz.answerPlaceholder', {
                      number: answerIndex + 1,
                    })}
                    disabled={disabled}
                    data-testid={`advent-calendar-quiz-answer-${answerIndex}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={
                      disabled || fields.length <= DOOR_QUIZ_MIN_ANSWERS
                    }
                    onClick={() => removeAnswer(answerIndex)}
                    aria-label={t('quiz.removeAnswer')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <FormMessage />
            {answersError && (
              <p className="text-sm text-destructive">{answersError}</p>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              disabled={disabled || fields.length >= DOOR_QUIZ_MAX_ANSWERS}
              onClick={() => append({ text: '' })}
            >
              <Plus className="mr-1 h-4 w-4" />
              {t('quiz.addAnswer')}
            </Button>
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name={`buttons.${index}.explanation`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('quiz.explanation')}</FormLabel>
            <FormControl>
              <Textarea
                {...field}
                maxLength={DOOR_QUIZ_EXPLANATION_MAX_LENGTH}
                disabled={disabled}
                data-testid="advent-calendar-quiz-explanation"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
