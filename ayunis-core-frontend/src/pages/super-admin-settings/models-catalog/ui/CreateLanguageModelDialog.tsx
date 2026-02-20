import { useForm } from 'react-hook-form';
import { useCreateLanguageModel } from '../api/useCreateLanguageModel';
import type { LanguageModelFormData } from '../model/types';
import type { CreateLanguageModelRequestDtoProvider } from '@/shared/api';
import { LANGUAGE_MODEL_PROVIDERS } from '@/features/models';
import { ModelFormDialog } from './ModelFormDialog';
import { LanguageModelCapabilityFields } from './LanguageModelCapabilityFields';

interface CreateLanguageModelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateLanguageModelDialog({
  open,
  onOpenChange,
}: Readonly<CreateLanguageModelDialogProps>) {
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
    },
  });

  const { createLanguageModel, isCreating } = useCreateLanguageModel(() => {
    onOpenChange(false);
    form.reset();
  });

  return (
    <ModelFormDialog
      title="Create Language Model"
      open={open}
      onOpenChange={onOpenChange}
      form={form}
      onSubmit={createLanguageModel}
      isSubmitting={isCreating}
      submitLabel="Create"
      submittingLabel="Creating..."
      providers={LANGUAGE_MODEL_PROVIDERS}
      namePlaceholder="e.g., gpt-4"
      displayNamePlaceholder="e.g., GPT-4"
    >
      <LanguageModelCapabilityFields form={form} disabled={isCreating} />
    </ModelFormDialog>
  );
}
