import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useCreateRoutine } from '@/pages/routines/api/useCreateRoutine';
import { formFieldsToDto } from '@/pages/routines/lib/routine-form-values';
import type { RoutineFormFields } from '@/pages/routines/model/types';
import { RoutineFormDialog } from './RoutineFormDialog';

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
  const form = useForm<RoutineFormFields>({ defaultValues: initialValues });
  const { createRoutine, isCreating } = useCreateRoutine(form, onClose);

  return (
    <RoutineFormDialog
      title={t('form.createTitle')}
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      form={form}
      onSubmit={(data) => createRoutine(formFieldsToDto(data))}
      isSubmitting={isCreating}
      submitLabel={t('form.create')}
    />
  );
}
