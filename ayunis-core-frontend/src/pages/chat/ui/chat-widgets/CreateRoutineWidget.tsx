import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import { Form } from '@ayunis/ui/components/form';
import { cn } from '@ayunis/ui/lib/cn';
import type { ToolUseMessageContent } from '@/pages/chat/model/openapi';
import {
  formFieldsToCreateDto,
  RoutineFormFieldset,
  useCreateRoutine,
  type RoutineFormFields,
} from '@/features/routines';
import {
  createRoutineParamsToFormFields,
  type CreateRoutineParams,
} from '@/pages/chat/lib/routine-widget-fields';

export default function CreateRoutineWidget({
  content,
  isStreaming = false,
}: Readonly<{
  content: ToolUseMessageContent;
  isStreaming?: boolean;
}>) {
  const { t } = useTranslation('chat');

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- content.params may be undefined during streaming even if typed as required
  const params = (content.params || {}) as CreateRoutineParams;

  const form = useForm<RoutineFormFields>({
    defaultValues: createRoutineParamsToFormFields(params),
  });
  const [created, setCreated] = useState(false);
  const { createRoutine, isCreating } = useCreateRoutine(form, () =>
    setCreated(true),
  );

  // Update the form when params change (for streaming updates)
  useEffect(() => {
    form.reset(
      createRoutineParamsToFormFields({
        name: params.name,
        prompt: params.prompt,
        daily_time: params.daily_time,
        internet_enabled: params.internet_enabled,
      }),
    );
  }, [
    form,
    params.name,
    params.prompt,
    params.daily_time,
    params.internet_enabled,
    content.id,
  ]);

  return (
    <div
      className={cn('my-2 w-full', isStreaming && 'animate-pulse')}
      key={`${content.name}-${content.id}`}
      data-testid="create-routine-widget"
    >
      <Form {...form}>
        <form
          onSubmit={(e) =>
            void form.handleSubmit((data) =>
              createRoutine(formFieldsToCreateDto(data)),
            )(e)
          }
          className="space-y-4"
        >
          <RoutineFormFieldset form={form} disabled={isCreating || created} />
          <Button
            type="submit"
            disabled={isCreating || created}
            data-testid="create-routine-widget-submit"
          >
            {created
              ? t('chat.tools.create_routine.created')
              : t('chat.tools.create_routine.create')}
          </Button>
        </form>
      </Form>
    </div>
  );
}
