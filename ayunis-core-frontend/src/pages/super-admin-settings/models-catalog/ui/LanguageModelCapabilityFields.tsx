import type { UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { LanguageModelFormData } from '../model/types';
import { ModelCheckboxField } from './ModelCheckboxField';

interface LanguageModelCapabilityFieldsProps {
  form: UseFormReturn<LanguageModelFormData>;
  disabled: boolean;
}

export function LanguageModelCapabilityFields({
  form,
  disabled,
}: Readonly<LanguageModelCapabilityFieldsProps>) {
  const { t } = useTranslation('super-admin-settings-org');
  return (
    <>
      <ModelCheckboxField
        control={form.control}
        name="canStream"
        label={t('models.catalog.dialog.streaming')}
        disabled={disabled}
      />
      <ModelCheckboxField
        control={form.control}
        name="canUseTools"
        label={t('models.catalog.dialog.tools')}
        disabled={disabled}
      />
      <ModelCheckboxField
        control={form.control}
        name="canVision"
        label={t('models.catalog.dialog.vision')}
        disabled={disabled}
      />
      <ModelCheckboxField
        control={form.control}
        name="isReasoning"
        label={t('models.catalog.dialog.reasoning')}
        disabled={disabled}
      />
    </>
  );
}
