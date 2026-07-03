import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useCreateLanguageModel } from '../api/useCreateLanguageModel';
import type { LanguageModelFormData } from '../model/types';
import { normalizeLanguageModelFormData } from '../lib/normalizeLanguageModelFormData';
import type { CreateLanguageModelRequestDtoProvider } from '@/shared/api';
import { LANGUAGE_MODEL_PROVIDERS } from '@/features/models';
import { ModelFormDialog } from './ModelFormDialog';
import { LanguageModelCapabilityFields } from './LanguageModelCapabilityFields';
import { LanguageModelTierField } from './LanguageModelTierField';
import { LanguageModelDescriptionField } from './LanguageModelDescriptionField';
import { ModelPricingFields } from './ModelPricingFields';

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
      <LanguageModelCapabilityFields form={form} disabled={isCreating} />
      <ModelPricingFields form={form} disabled={isCreating} />
    </ModelFormDialog>
  );
}
