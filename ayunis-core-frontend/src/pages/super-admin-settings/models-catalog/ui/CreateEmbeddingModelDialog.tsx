import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useCreateEmbeddingModel } from '../api/useCreateEmbeddingModel';
import type { EmbeddingModelFormData } from '../model/types';
import type { CreateEmbeddingModelRequestDtoProvider } from '@/shared/api';
import { EMBEDDING_MODEL_PROVIDERS } from '@/features/models';
import { ModelFormDialog } from './ModelFormDialog';
import { EmbeddingDimensionsField } from './EmbeddingDimensionsField';
import { ModelPricingFields } from './ModelPricingFields';

interface CreateEmbeddingModelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateEmbeddingModelDialog({
  open,
  onOpenChange,
}: Readonly<CreateEmbeddingModelDialogProps>) {
  const { t } = useTranslation('super-admin-settings-org');
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
      title={t('models.catalog.dialog.createEmbeddingTitle')}
      open={open}
      onOpenChange={onOpenChange}
      form={form}
      onSubmit={createEmbeddingModel}
      isSubmitting={isCreating}
      mode="create"
      providers={EMBEDDING_MODEL_PROVIDERS}
      namePlaceholder={t('models.catalog.dialog.embeddingNamePlaceholder')}
      displayNamePlaceholder={t(
        'models.catalog.dialog.embeddingDisplayNamePlaceholder',
      )}
    >
      <EmbeddingDimensionsField
        form={form}
        disabled={isCreating}
        mode="create"
      />
      <ModelPricingFields form={form} disabled={isCreating} />
    </ModelFormDialog>
  );
}
