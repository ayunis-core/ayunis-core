import { useForm } from 'react-hook-form';
import { useCreateEmbeddingModel } from '../api/useCreateEmbeddingModel';
import type { EmbeddingModelFormData } from '../model/types';
import type { CreateEmbeddingModelRequestDtoProvider } from '@/shared/api';
import { EMBEDDING_MODEL_PROVIDERS } from '@/features/models';
import { ModelFormDialog } from './ModelFormDialog';
import { EmbeddingDimensionsField } from './EmbeddingDimensionsField';

interface CreateEmbeddingModelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateEmbeddingModelDialog({
  open,
  onOpenChange,
}: Readonly<CreateEmbeddingModelDialogProps>) {
  const form = useForm<EmbeddingModelFormData>({
    defaultValues: {
      name: '',
      provider: 'openai' as CreateEmbeddingModelRequestDtoProvider,
      displayName: '',
      dimensions: 1536,
      isArchived: false,
    },
  });

  const { createEmbeddingModel, isCreating } = useCreateEmbeddingModel(() => {
    onOpenChange(false);
    form.reset();
  });

  return (
    <ModelFormDialog
      title="Create Embedding Model"
      open={open}
      onOpenChange={onOpenChange}
      form={form}
      onSubmit={createEmbeddingModel}
      isSubmitting={isCreating}
      submitLabel="Create"
      submittingLabel="Creating..."
      providers={EMBEDDING_MODEL_PROVIDERS}
      namePlaceholder="e.g., text-embedding-3-small"
      displayNamePlaceholder="e.g., Text Embedding 3 Small"
    >
      <EmbeddingDimensionsField
        form={form}
        disabled={isCreating}
        mode="create"
      />
    </ModelFormDialog>
  );
}
