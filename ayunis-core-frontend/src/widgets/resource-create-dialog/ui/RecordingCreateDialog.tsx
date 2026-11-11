import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import * as z from 'zod';
import { NameField } from '@/widgets/entity-form-fields';
import type { OwnerSelection } from '@/features/resource-ownership';
import {
  OwnedResourceCreateDialog,
  type OwnedResourceCreateDialogProps,
} from './OwnedResourceCreateDialog';

export interface CreateRecordingFormData {
  name: string;
}

export type CreateRecordingSubmission = CreateRecordingFormData & {
  owner?: OwnerSelection;
};

export function RecordingCreateDialog(
  props: Readonly<OwnedResourceCreateDialogProps<CreateRecordingFormData>>,
) {
  const { t } = useTranslation('recordings');
  const form = useForm<CreateRecordingFormData>({
    resolver: zodResolver(
      z.object({
        name: z
          .string()
          .trim()
          .min(1, t('createDialog.validation.nameRequired'))
          .max(255),
      }),
    ),
    defaultValues: { name: '' },
  });

  return (
    <OwnedResourceCreateDialog
      {...props}
      form={form}
      namespace="recordings"
      ownerTestId="recording-create-owner"
      groupedOwners
    >
      <NameField
        control={form.control}
        name="name"
        translationNamespace="recordings"
      />
    </OwnedResourceCreateDialog>
  );
}
