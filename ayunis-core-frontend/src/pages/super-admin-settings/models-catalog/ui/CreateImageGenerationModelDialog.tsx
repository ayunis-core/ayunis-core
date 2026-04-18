import { useForm } from 'react-hook-form';
import { useCreateImageGenerationModel } from '../api/useCreateImageGenerationModel';
import type { ImageGenerationModelFormData } from '../model/types';
import type { CreateImageGenerationModelRequestDtoProvider } from '@/shared/api';
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
  const form = useForm<ImageGenerationModelFormData>({
    defaultValues: {
      name: '',
      provider: 'azure' as CreateImageGenerationModelRequestDtoProvider,
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
      title="Create Image Generation Model"
      open={open}
      onOpenChange={onOpenChange}
      form={form}
      onSubmit={createImageGenerationModel}
      isSubmitting={isCreating}
      submitLabel="Create"
      submittingLabel="Creating..."
      providers={IMAGE_GENERATION_MODEL_PROVIDERS}
      namePlaceholder="e.g., gpt-image-1"
      displayNamePlaceholder="e.g., GPT Image 1"
    >
      <ModelPricingFields form={form} disabled={isCreating} />
    </ModelFormDialog>
  );
}
