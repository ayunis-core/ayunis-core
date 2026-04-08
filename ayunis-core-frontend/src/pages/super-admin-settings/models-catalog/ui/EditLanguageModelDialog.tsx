import { useForm } from 'react-hook-form';
import { useEffect } from 'react';
import { useUpdateLanguageModel } from '../api/useUpdateLanguageModel';
import type { LanguageModelFormData } from '../model/types';
import type {
  LanguageModelResponseDto,
  UpdateLanguageModelRequestDtoProvider,
} from '@/shared/api';
import { LANGUAGE_MODEL_PROVIDERS } from '@/features/models';
import { ModelFormDialog } from './ModelFormDialog';
import { LanguageModelCapabilityFields } from './LanguageModelCapabilityFields';
import { LanguageModelTierField } from './LanguageModelTierField';
import { ModelPricingFields } from './ModelPricingFields';

interface EditLanguageModelDialogProps {
  model: LanguageModelResponseDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditLanguageModelDialog({
  model,
  open,
  onOpenChange,
}: Readonly<EditLanguageModelDialogProps>) {
  const { updateLanguageModel, isUpdating } = useUpdateLanguageModel(() => {
    onOpenChange(false);
  });

  const form = useForm<LanguageModelFormData>({
    defaultValues: {
      name: '',
      provider: 'openai' as UpdateLanguageModelRequestDtoProvider,
      displayName: '',
      canStream: false,
      canUseTools: false,
      canVision: false,
      isReasoning: false,
      isArchived: false,
      tier: undefined,
    },
  });

  // Reset form when model changes or dialog opens
  useEffect(() => {
    if (model && open) {
      form.reset({
        name: model.name,
        provider: model.provider,
        displayName: model.displayName,
        canStream: model.canStream,
        canUseTools: model.canUseTools,
        canVision: model.canVision,
        isReasoning: model.isReasoning,
        isArchived: model.isArchived,
        inputTokenCost: model.inputTokenCost,
        outputTokenCost: model.outputTokenCost,
        tier: model.tier,
      });
    }
  }, [model, open, form]);

  const handleSubmit = (data: LanguageModelFormData) => {
    if (!model) return;
    updateLanguageModel(model.id, data);
  };

  return (
    <ModelFormDialog
      title="Edit Language Model"
      open={open}
      onOpenChange={onOpenChange}
      form={form}
      onSubmit={handleSubmit}
      isSubmitting={isUpdating}
      submitLabel="Update"
      submittingLabel="Updating..."
      providers={LANGUAGE_MODEL_PROVIDERS}
      namePlaceholder="e.g., gpt-4"
      displayNamePlaceholder="e.g., GPT-4"
      hasContent={!!model}
    >
      <LanguageModelCapabilityFields form={form} disabled={isUpdating} />
      <ModelPricingFields form={form} disabled={isUpdating} />
      <LanguageModelTierField form={form} disabled={isUpdating} />
    </ModelFormDialog>
  );
}
