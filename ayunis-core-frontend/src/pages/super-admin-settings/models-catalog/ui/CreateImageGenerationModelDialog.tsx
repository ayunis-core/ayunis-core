import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useCreateImageGenerationModel } from '../api/useCreateImageGenerationModel';
import type { ImageGenerationModelFormData } from '../model/types';
import { IMAGE_GENERATION_MODEL_PROVIDERS } from '@/features/models';
import { ModelFormDialog } from './ModelFormDialog';
import { ModelPricingFields } from './ModelPricingFields';

interface CreateImageGenerationModelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateImageGenerationModelDialog({
  open,
  onOpenChange,
}: Readonly<CreateImageGenerationModelDialogProps>) {
  const { t } = useTranslation('super-admin-settings-org');
  const form = useForm<ImageGenerationModelFormData>({
    defaultValues: {
      name: '',
      provider: 'azure',
      displayName: '',
      isArchived: false,
    },
  });

  const { createImageGenerationModel, isCreating } =
    useCreateImageGenerationModel(() => {
      onOpenChange(false);
      form.reset();
    });

  return (
    <ModelFormDialog
      title={t('models.catalog.dialog.createImageGenerationTitle')}
      open={open}
      onOpenChange={onOpenChange}
      form={form}
      onSubmit={createImageGenerationModel}
      isSubmitting={isCreating}
      mode="create"
      providers={IMAGE_GENERATION_MODEL_PROVIDERS}
      namePlaceholder={t(
        'models.catalog.dialog.imageGenerationNamePlaceholder',
      )}
      displayNamePlaceholder={t(
        'models.catalog.dialog.imageGenerationDisplayNamePlaceholder',
      )}
    >
      <ModelPricingFields form={form} disabled={isCreating} />
    </ModelFormDialog>
  );
}
