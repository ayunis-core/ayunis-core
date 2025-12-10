import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { usePromptsControllerUpdate } from '@/shared/api/generated/ayunisCoreAPI';
import {
  editPromptFormSchema,
  type EditPromptFormValues,
} from '../model/editPromptSchema';
import { useQueryClient } from '@tanstack/react-query';
import { showError, showSuccess } from '@/shared/lib/toast';
import { useTranslation } from 'react-i18next';
import extractErrorData from '@/shared/api/extract-error-data';

interface UseEditPromptOptions {
  onSuccessCallback?: () => void;
}

export function useEditPrompt(options?: UseEditPromptOptions) {
  const { t } = useTranslation('prompts');
  const queryClient = useQueryClient();
  const updatePromptMutation = usePromptsControllerUpdate();

  const form = useForm<EditPromptFormValues>({
    resolver: zodResolver(editPromptFormSchema),
    defaultValues: {
      id: '',
      title: '',
      content: '',
    },
  });

  function onSubmit(values: EditPromptFormValues) {
    const { id, ...rest } = values;
    updatePromptMutation.mutate(
      {
        id,
        data: rest,
      },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({ queryKey: ['prompts'] });
          showSuccess(t('updateSuccess'));
          if (options?.onSuccessCallback) {
            options.onSuccessCallback();
          }
        },
        onError: (error) => {
          console.error('Update prompt failed:', error);
          const { code } = extractErrorData(error);
          switch (code) {
            case 'PROMPT_NOT_FOUND':
              showError(t('notFound'));
              break;
            default:
              showError(t('updateError'));
          }
        },
      },
    );
  }

  return {
    form,
    onSubmit,
    isLoading: updatePromptMutation.isPending,
  };
}
