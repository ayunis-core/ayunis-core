import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import { Form } from '@ayunis/ui/components/form';
import {
  formFieldsToUpdateDto,
  RoutineFormFieldset,
  RoutineRunStatusLine,
  RoutineScheduleLine,
  routineToFormFields,
  useUpdateRoutine,
  type Routine,
  type RoutineFormFields,
} from '@/features/routines';

export function RoutineConfigurationTab({
  routine,
}: Readonly<{ routine: Routine }>) {
  return (
    <div className="grid gap-4">
      <RoutineStatusCard routine={routine} />
      <RoutineConfigurationCard routine={routine} />
    </div>
  );
}

function RoutineStatusCard({ routine }: Readonly<{ routine: Routine }>) {
  const { t } = useTranslation('routines');
  return (
    <Card data-testid="routine-status-card">
      <CardHeader>
        <CardTitle>{t('detail.status.title')}</CardTitle>
        <CardDescription>{t('detail.status.description')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 text-sm">
        <RoutineRunStatusLine routine={routine} />
        <RoutineScheduleLine routine={routine} />
      </CardContent>
    </Card>
  );
}

function RoutineConfigurationCard({ routine }: Readonly<{ routine: Routine }>) {
  const { t } = useTranslation('routines');
  const form = useForm<RoutineFormFields>({
    defaultValues: routineToFormFields(routine),
  });
  const { updateRoutine, isUpdating } = useUpdateRoutine(form);

  return (
    <Card data-testid="routine-configuration-card">
      <CardHeader>
        <CardTitle>{t('detail.configuration.title')}</CardTitle>
        <CardDescription>
          {t('detail.configuration.description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={(e) =>
              void form.handleSubmit((data) =>
                updateRoutine(routine.id, formFieldsToUpdateDto(data)),
              )(e)
            }
            className="space-y-4"
            data-testid="routine-form"
          >
            <RoutineFormFieldset form={form} disabled={isUpdating} />
            <Button
              type="submit"
              disabled={isUpdating}
              data-testid="routine-form-submit"
            >
              {t('form.save')}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
