import { useForm } from 'react-hook-form';
import { useEffect } from 'react';
import { useUpdateImageGenerationModel } from '../api/useUpdateImageGenerationModel';
import type { ImageGenerationModelFormData } from '../model/types';
import type {
  ImageGenerationModelResponseDto,
  UpdateImageGenerationModelRequestDtoProvider,
} from '@/shared/api';
import { IMAGE_GENERATION_MODEL_PROVIDERS } from '@/features/models';
import { ModelFormDialog } from './ModelFormDialog';

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
  const { updateImageGenerationModel, isUpdating } =
    useUpdateImageGenerationModel(() => {
      onOpenChange(false);
    });

  const form = useForm<ImageGenerationModelFormData>({
    defaultValues: {
      name: '',
      provider: 'azure' as UpdateImageGenerationModelRequestDtoProvider,
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
      });
    }
  }, [model, open, form]);

  function handleSubmit(data: ImageGenerationModelFormData) {
    if (!model) return;
    updateImageGenerationModel(model.id, data);
  }

  return (
    <ModelFormDialog
      title="Edit Image Generation Model"
      open={open}
      onOpenChange={onOpenChange}
      form={form}
      onSubmit={handleSubmit}
      isSubmitting={isUpdating}
      submitLabel="Update"
      submittingLabel="Updating..."
      providers={IMAGE_GENERATION_MODEL_PROVIDERS}
      namePlaceholder="e.g., gpt-image-1"
      displayNamePlaceholder="e.g., GPT Image 1"
      hasContent={!!model}
    />
  );
}
