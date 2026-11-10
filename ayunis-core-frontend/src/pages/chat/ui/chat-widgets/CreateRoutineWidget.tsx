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
  routineToFormFields,
  useCreateRoutine,
  type Routine,
  type RoutineFormFields,
} from '@/features/routines';
import { useRoutineFromProposal } from '@/pages/chat/api/useRoutineFromProposal';
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
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- content.params may be undefined during streaming even if typed as required
  const params = (content.params || {}) as CreateRoutineParams;
  const { routine, isLoading } = useRoutineFromProposal(content.id);

  return (
    <div
      className={cn('my-2 w-full', isStreaming && 'animate-pulse')}
      key={`${content.name}-${content.id}`}
      data-testid="create-routine-widget"
    >
      {/* Remounting once the routine exists shows what was saved, not the proposal. */}
      <CreateRoutineForm
        key={routine?.id ?? 'proposal'}
        toolCallId={content.id}
        params={params}
        createdRoutine={routine}
        lookupPending={isLoading}
      />
    </div>
  );
}

function CreateRoutineForm({
  toolCallId,
  params,
  createdRoutine,
  lookupPending,
}: Readonly<{
  toolCallId: string;
  params: CreateRoutineParams;
  createdRoutine?: Routine;
  lookupPending: boolean;
}>) {
  const { t } = useTranslation('chat');
  const form = useForm<RoutineFormFields>({
    defaultValues: createdRoutine
      ? routineToFormFields(createdRoutine)
      : createRoutineParamsToFormFields(params),
  });
  // Bridges the gap until the refetched routine list contains the new routine.
  const [justCreated, setJustCreated] = useState(false);
  const { createRoutine, isCreating } = useCreateRoutine(form, () =>
    setJustCreated(true),
  );
  const created = !!createdRoutine || justCreated;
  // Without the call ID the routine could not be linked to the proposal.
  const disabled = !toolCallId || lookupPending || isCreating || created;

  useEffect(() => {
    if (createdRoutine) return;
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
    createdRoutine,
    params.name,
    params.prompt,
    params.daily_time,
    params.internet_enabled,
  ]);

  return (
    <Form {...form}>
      <form
        onSubmit={(e) =>
          void form.handleSubmit((data) =>
            createRoutine({
              ...formFieldsToCreateDto(data),
              sourceToolCallId: toolCallId,
            }),
          )(e)
        }
        className="space-y-4"
      >
        <RoutineFormFieldset form={form} disabled={disabled} />
        <Button
          type="submit"
          disabled={disabled}
          data-testid="create-routine-widget-submit"
        >
          {created
            ? t('chat.tools.create_routine.created')
            : t('chat.tools.create_routine.create')}
        </Button>
      </form>
    </Form>
  );
}
