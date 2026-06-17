import { useForm } from 'react-hook-form';
import { useEffect } from 'react';
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
      title="Edit Embedding Model"
      open={open}
      onOpenChange={onOpenChange}
      form={form}
      onSubmit={handleSubmit}
      isSubmitting={isUpdating}
      submitLabel="Update"
      submittingLabel="Updating..."
      providers={EMBEDDING_MODEL_PROVIDERS}
      namePlaceholder="e.g., text-embedding-3-small"
      displayNamePlaceholder="e.g., Text Embedding 3 Small"
      hasContent={!!model}
    >
      <EmbeddingDimensionsField form={form} disabled={isUpdating} mode="edit" />
      <ModelPricingFields form={form} disabled={isUpdating} />
    </ModelFormDialog>
  );
}
