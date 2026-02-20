import type { UseFormReturn } from 'react-hook-form';
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
  return (
    <>
      <ModelCheckboxField
        control={form.control}
        name="canStream"
        label="Supports Streaming"
        disabled={disabled}
      />
      <ModelCheckboxField
        control={form.control}
        name="canUseTools"
        label="Supports Tool Use"
        disabled={disabled}
      />
      <ModelCheckboxField
        control={form.control}
        name="canVision"
        label="Supports Vision"
        disabled={disabled}
      />
      <ModelCheckboxField
        control={form.control}
        name="isReasoning"
        label="Has Reasoning Capabilities"
        disabled={disabled}
      />
    </>
  );
}
