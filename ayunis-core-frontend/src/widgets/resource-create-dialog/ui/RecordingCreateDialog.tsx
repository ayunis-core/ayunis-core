import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import * as z from 'zod';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@ayunis/ui/components/form';
import { Input } from '@ayunis/ui/components/input';
import { NameField } from '@/widgets/entity-form-fields';
import type { OwnerSelection } from '@/features/resource-ownership';
import {
  ACCEPTED_AUDIO_PICKER_TYPES,
  isAudioFileName,
} from '@/shared/lib/audio-files';
import {
  OwnedResourceCreateDialog,
  type OwnedResourceCreateDialogProps,
} from './OwnedResourceCreateDialog';

export interface CreateRecordingFormData {
  name: string;
  /** The meeting's audio, uploaded once the recording exists. */
  file: File;
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
        file: z
          .instanceof(File, {
            message: t('createDialog.validation.fileRequired'),
          })
          .refine((file) => isAudioFileName(file.name), {
            message: t('createDialog.validation.fileNotAudio'),
          }),
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
      <FormField
        control={form.control}
        name="file"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('createDialog.form.fileLabel')}</FormLabel>
            <FormControl>
              <Input
                type="file"
                accept={ACCEPTED_AUDIO_PICKER_TYPES}
                data-testid="recording-create-audio"
                name={field.name}
                ref={field.ref}
                onBlur={field.onBlur}
                onChange={(event) => field.onChange(event.target.files?.[0])}
              />
            </FormControl>
            <FormDescription>
              {t('createDialog.form.fileDescription')}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </OwnedResourceCreateDialog>
  );
}
