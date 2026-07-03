import { useForm } from 'react-hook-form';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUpdateEmbeddingModel } from '../api/useUpdateEmbeddingModel';
import type { EmbeddingModelFormData } from '../model/types';
import type {
  EmbeddingModelResponseDto,
  UpdateEmbeddingModelRequestDtoProvider,
} from '@/shared/api';
import { EMBEDDING_MODEL_PROVIDERS } from '@/features/models';
import { ModelFormDialog } from './ModelFormDialog';
import { EmbeddingDimensionsField } from './EmbeddingDimensionsField';
import { ModelPricingFields } from './ModelPricingFields';

interface EditEmbeddingModelDialogProps {
  model: EmbeddingModelResponseDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditEmbeddingModelDialog({
  model,
  open,
  onOpenChange,
}: Readonly<EditEmbeddingModelDialogProps>) {
  const { t } = useTranslation('super-admin-settings-org');
  const { updateEmbeddingModel, isUpdating } = useUpdateEmbeddingModel(() => {
    onOpenChange(false);
  });

  const form = useForm<EmbeddingModelFormData>({
    defaultValues: {
      name: '',
      provider: 'openai' as UpdateEmbeddingModelRequestDtoProvider,
      displayName: '',
      dimensions: 1536,
      isArchived: false,
    },
  });

  // Reset form when model changes or dialog opens
  useEffect(() => {
    if (model && open) {
      form.reset({
        name: model.name,
        provider: model.provider,
        displayName: model.displayName,
        dimensions: model.dimensions,
        isArchived: model.isArchived,
        inputTokenCost: model.inputTokenCost,
        outputTokenCost: model.outputTokenCost,
      });
    }
  }, [model, open, form]);

  const handleSubmit = (data: EmbeddingModelFormData) => {
    if (!model) return;
    updateEmbeddingModel(model.id, data);
  };

  return (
    <ModelFormDialog
      title={t('models.catalog.dialog.editEmbeddingTitle')}
      open={open}
      onOpenChange={onOpenChange}
      form={form}
      onSubmit={handleSubmit}
      isSubmitting={isUpdating}
      mode="edit"
      providers={EMBEDDING_MODEL_PROVIDERS}
      namePlaceholder={t('models.catalog.dialog.embeddingNamePlaceholder')}
      displayNamePlaceholder={t(
        'models.catalog.dialog.embeddingDisplayNamePlaceholder',
      )}
      hasContent={!!model}
    >
      <EmbeddingDimensionsField form={form} disabled={isUpdating} mode="edit" />
      <ModelPricingFields form={form} disabled={isUpdating} />
    </ModelFormDialog>
  );
}
