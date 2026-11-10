import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import { Form } from '@ayunis/ui/components/form';
import { cn } from '@ayunis/ui/lib/cn';
import type { ToolUseMessageContent } from '@/pages/chat/model/openapi';
import {
  formFieldsToUpdateDto,
  RoutineFormFieldset,
  useUpdateRoutine,
  type Routine,
  type RoutineFormFields,
} from '@/features/routines';
import { useRoutineToEdit } from '@/pages/chat/api/useRoutineToEdit';
import {
  editRoutineParamsToFormFields,
  type EditRoutineParams,
} from '@/pages/chat/lib/routine-widget-fields';

export default function EditRoutineWidget({
  content,
  isStreaming = false,
}: Readonly<{
  content: ToolUseMessageContent;
  isStreaming?: boolean;
}>) {
  const { t } = useTranslation('chat');

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- content.params may be undefined during streaming even if typed as required
  const params = (content.params || {}) as EditRoutineParams;
  const { routine, lookupComplete } = useRoutineToEdit(params.routine_id);
  const routineNotFound =
    !isStreaming && !!params.routine_id && lookupComplete && !routine;

  return (
    <div
      className={cn('my-2 w-full space-y-4', isStreaming && 'animate-pulse')}
      key={`${content.name}-${content.id}`}
      data-testid="edit-routine-widget"
    >
      {params.change_summary && (
        <p className="text-sm text-muted-foreground">
          {t('chat.tools.edit_routine.changeSummary')}: {params.change_summary}
        </p>
      )}
      {/* Remounting once the routine has loaded starts the form from its stored
          model, so the form never holds the default model while editing or
          saving is possible. */}
      <EditRoutineForm
        key={routine?.id ?? 'loading'}
        params={params}
        routine={routine}
        routineNotFound={routineNotFound}
      />
    </div>
  );
}

function EditRoutineForm({
  params,
  routine,
  routineNotFound,
}: Readonly<{
  params: EditRoutineParams;
  routine?: Routine;
  routineNotFound: boolean;
}>) {
  const { t } = useTranslation('chat');
  // Saving puts the updated routine into the query cache. Merging the proposal
  // over that one would overwrite the reviewed values, so the routine loaded
  // at mount stays the baseline.
  const [storedRoutine] = useState(routine);
  const form = useForm<RoutineFormFields>({
    defaultValues: editRoutineParamsToFormFields(params, storedRoutine),
  });
  const [updated, setUpdated] = useState(false);
  const { updateRoutine, isUpdating } = useUpdateRoutine(form, () =>
    setUpdated(true),
  );

  // Update the form when params change (for streaming updates)
  useEffect(() => {
    form.reset(
      editRoutineParamsToFormFields(
        {
          name: params.name,
          prompt: params.prompt,
          daily_time: params.daily_time,
          internet_enabled: params.internet_enabled,
        },
        storedRoutine,
      ),
    );
  }, [
    form,
    params.name,
    params.prompt,
    params.daily_time,
    params.internet_enabled,
    storedRoutine,
  ]);

  return (
    <Form {...form}>
      <form
        onSubmit={(e) =>
          void form.handleSubmit((data) => {
            if (storedRoutine)
              updateRoutine(storedRoutine.id, formFieldsToUpdateDto(data));
          })(e)
        }
        className="space-y-4"
      >
        <RoutineFormFieldset
          form={form}
          disabled={!storedRoutine || isUpdating || updated}
        />
        <div className="flex w-full items-center gap-2">
          <Button
            type="submit"
            disabled={!storedRoutine || isUpdating || updated}
            data-testid="edit-routine-widget-submit"
          >
            {updated
              ? t('chat.tools.edit_routine.updated')
              : t('chat.tools.edit_routine.update')}
          </Button>
          {routineNotFound && (
            <p className="text-sm text-destructive">
              {t('chat.tools.edit_routine.routineNotFound')}
            </p>
          )}
        </div>
      </form>
    </Form>
  );
}
