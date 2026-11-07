import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useUpdateRoutine } from '@/pages/routines/api/useUpdateRoutine';
import {
  formFieldsToDto,
  routineToFormFields,
} from '@/pages/routines/lib/routine-form-values';
import type { Routine } from '@/pages/routines/model/openapi';
import type { RoutineFormFields } from '@/pages/routines/model/types';
import { RoutineFormDialog } from './RoutineFormDialog';

interface EditRoutineDialogProps {
  routine: Routine;
  onClose: () => void;
}

export function EditRoutineDialog({
  routine,
  onClose,
}: Readonly<EditRoutineDialogProps>) {
  const { t } = useTranslation('routines');
  const form = useForm<RoutineFormFields>({
    defaultValues: routineToFormFields(routine),
  });
  const { updateRoutine, isUpdating } = useUpdateRoutine(form, onClose);

  return (
    <RoutineFormDialog
      title={t('form.editTitle')}
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      form={form}
      onSubmit={(data) => updateRoutine(routine.id, formFieldsToDto(data))}
      isSubmitting={isUpdating}
      submitLabel={t('form.save')}
    />
  );
}
