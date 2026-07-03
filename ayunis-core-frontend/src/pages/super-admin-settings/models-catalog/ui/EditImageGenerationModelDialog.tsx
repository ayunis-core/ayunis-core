import { useForm } from 'react-hook-form';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUpdateImageGenerationModel } from '../api/useUpdateImageGenerationModel';
import type { ImageGenerationModelFormData } from '../model/types';
import type { ImageGenerationModelResponseDto } from '@/shared/api';
import { IMAGE_GENERATION_MODEL_PROVIDERS } from '@/features/models';
import { ModelFormDialog } from './ModelFormDialog';
import { ModelPricingFields } from './ModelPricingFields';

interface EditImageGenerationModelDialogProps {
  model: ImageGenerationModelResponseDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditImageGenerationModelDialog({
  model,
  open,
  onOpenChange,
}: Readonly<EditImageGenerationModelDialogProps>) {
  const { t } = useTranslation('super-admin-settings-org');
  const { updateImageGenerationModel, isUpdating } =
    useUpdateImageGenerationModel(() => {
      onOpenChange(false);
    });

  const form = useForm<ImageGenerationModelFormData>({
    defaultValues: {
      name: '',
      provider: 'azure',
      displayName: '',
      isArchived: false,
    },
  });

  useEffect(() => {
    if (model && open) {
      form.reset({
        name: model.name,
        provider: model.provider,
        displayName: model.displayName,
        isArchived: model.isArchived,
        inputTokenCost: model.inputTokenCost,
        outputTokenCost: model.outputTokenCost,
      });
    }
  }, [model, open, form]);

  function handleSubmit(data: ImageGenerationModelFormData) {
    if (!model) return;
    updateImageGenerationModel(model.id, data);
  }

  return (
    <ModelFormDialog
      title={t('models.catalog.dialog.editImageGenerationTitle')}
      open={open}
      onOpenChange={onOpenChange}
      form={form}
      onSubmit={handleSubmit}
      isSubmitting={isUpdating}
      mode="edit"
      providers={IMAGE_GENERATION_MODEL_PROVIDERS}
      namePlaceholder={t(
        'models.catalog.dialog.imageGenerationNamePlaceholder',
      )}
      displayNamePlaceholder={t(
        'models.catalog.dialog.imageGenerationDisplayNamePlaceholder',
      )}
      hasContent={!!model}
    >
      <ModelPricingFields form={form} disabled={isUpdating} />
    </ModelFormDialog>
  );
}
