import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useCreateLanguageModel } from '@/pages/super-admin-settings/models-catalog/api/useCreateLanguageModel';
import type { LanguageModelFormData } from '@/pages/super-admin-settings/models-catalog/model/types';
import { normalizeLanguageModelFormData } from '@/pages/super-admin-settings/models-catalog/lib/normalizeLanguageModelFormData';
import type { CreateLanguageModelRequestDtoProvider } from '@/shared/api';
import { LANGUAGE_MODEL_PROVIDERS } from '@/features/models';
import { ModelFormDialog } from './ModelFormDialog';
import { LanguageModelCapabilityFields } from './LanguageModelCapabilityFields';
import { LanguageModelTierField } from './LanguageModelTierField';
import { LanguageModelDescriptionField } from './LanguageModelDescriptionField';
import { ModelPricingFields } from './ModelPricingFields';
import { ModelCheckboxField } from './ModelCheckboxField';

interface CreateLanguageModelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateLanguageModelDialog({
  open,
  onOpenChange,
}: Readonly<CreateLanguageModelDialogProps>) {
  const { t } = useTranslation('super-admin-settings-org');
  const form = useForm<LanguageModelFormData>({
    defaultValues: {
      name: '',
      provider: 'openai' as CreateLanguageModelRequestDtoProvider,
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

  const { createLanguageModel, isCreating } = useCreateLanguageModel(() => {
    onOpenChange(false);
    form.reset();
  });

  const handleSubmit = (data: LanguageModelFormData) => {
    createLanguageModel(normalizeLanguageModelFormData(data));
  };

  return (
    <ModelFormDialog
      title={t('models.catalog.dialog.createLanguageTitle')}
      open={open}
      onOpenChange={onOpenChange}
      form={form}
      onSubmit={handleSubmit}
      isSubmitting={isCreating}
      mode="create"
      providers={LANGUAGE_MODEL_PROVIDERS}
      namePlaceholder={t('models.catalog.dialog.languageNamePlaceholder')}
      displayNamePlaceholder={t(
        'models.catalog.dialog.languageDisplayNamePlaceholder',
      )}
    >
      <LanguageModelTierField form={form} disabled={isCreating} />
      <LanguageModelDescriptionField form={form} disabled={isCreating} />
      <ModelCheckboxField
        control={form.control}
        name="hasProviderFault"
        label={t('models.catalog.dialog.providerFault')}
        disabled={isCreating}
        testId="model-catalog-provider-fault"
      />
      <LanguageModelCapabilityFields form={form} disabled={isCreating} />
      <ModelPricingFields form={form} disabled={isCreating} />
    </ModelFormDialog>
  );
}
