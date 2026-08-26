import { useForm } from 'react-hook-form';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUpdateLanguageModel } from '@/pages/super-admin-settings/models-catalog/api/useUpdateLanguageModel';
import type { LanguageModelFormData } from '@/pages/super-admin-settings/models-catalog/model/types';
import { normalizeLanguageModelFormData } from '@/pages/super-admin-settings/models-catalog/lib/normalizeLanguageModelFormData';
import type {
  LanguageModelResponseDto,
  UpdateLanguageModelRequestDtoProvider,
} from '@/shared/api';
import { LANGUAGE_MODEL_PROVIDERS } from '@/features/models';
import { ModelFormDialog } from './ModelFormDialog';
import { LanguageModelCapabilityFields } from './LanguageModelCapabilityFields';
import { LanguageModelTierField } from './LanguageModelTierField';
import { LanguageModelDescriptionField } from './LanguageModelDescriptionField';
import { ModelPricingFields } from './ModelPricingFields';
import { ModelCheckboxField } from './ModelCheckboxField';

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
  const { t } = useTranslation('super-admin-settings-org');
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
      hasProviderFault: false,
      tier: undefined,
      description: '',
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
        hasProviderFault: model.hasProviderFault,
        inputTokenCost: model.inputTokenCost,
        outputTokenCost: model.outputTokenCost,
        tier: model.tier,
        description: model.description ?? '',
      });
    }
  }, [model, open, form]);

  const handleSubmit = (data: LanguageModelFormData) => {
    if (!model) return;
    updateLanguageModel(model.id, normalizeLanguageModelFormData(data));
  };

  return (
    <ModelFormDialog
      title={t('models.catalog.dialog.editLanguageTitle')}
      open={open}
      onOpenChange={onOpenChange}
      form={form}
      onSubmit={handleSubmit}
      isSubmitting={isUpdating}
      mode="edit"
      providers={LANGUAGE_MODEL_PROVIDERS}
      namePlaceholder={t('models.catalog.dialog.languageNamePlaceholder')}
      displayNamePlaceholder={t(
        'models.catalog.dialog.languageDisplayNamePlaceholder',
      )}
      hasContent={!!model}
    >
      <LanguageModelTierField form={form} disabled={isUpdating} />
      <LanguageModelDescriptionField form={form} disabled={isUpdating} />
      <ModelCheckboxField
        control={form.control}
        name="hasProviderFault"
        label={t('models.catalog.dialog.providerFault')}
        disabled={isUpdating}
        testId="model-catalog-provider-fault"
      />
      <LanguageModelCapabilityFields form={form} disabled={isUpdating} />
      <ModelPricingFields form={form} disabled={isUpdating} />
    </ModelFormDialog>
  );
}
