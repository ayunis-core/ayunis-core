import { useForm } from 'react-hook-form';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ayunis/ui/components/dialog';
import { Form } from '@ayunis/ui/components/form';
import { Button } from '@ayunis/ui/components/button';
import {
  formFieldsToCreateDto,
  RoutineFormFieldset,
  useCreateRoutine,
  type RoutineFormFields,
} from '@/features/routines';

interface CreateRoutineDialogProps {
  /** The fields to start from: empty, or a premade routine. */
  initialValues: RoutineFormFields;
  onClose: () => void;
}

export function CreateRoutineDialog({
  initialValues,
  onClose,
}: Readonly<CreateRoutineDialogProps>) {
  const { t } = useTranslation('routines');
  const navigate = useNavigate();
  const form = useForm<RoutineFormFields>({ defaultValues: initialValues });
  const { createRoutine, isCreating } = useCreateRoutine(form, (routine) => {
    onClose();
    void navigate({
      to: '/routines/$routineId',
      params: { routineId: routine.id },
    });
  });

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>{t('form.createTitle')}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={(e) =>
              void form.handleSubmit((data) =>
                createRoutine(formFieldsToCreateDto(data)),
              )(e)
            }
            className="space-y-4"
            data-testid="routine-form"
          >
            <RoutineFormFieldset form={form} disabled={isCreating} />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isCreating}
              >
                {t('form.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={isCreating}
                data-testid="routine-form-submit"
              >
                {t('form.create')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
