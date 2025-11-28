import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  usePromptsControllerCreate,
  getPromptsControllerFindAllQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import {
  createPromptFormSchema,
  type CreatePromptFormValues,
} from '../model/createPromptSchema';
import { useQueryClient } from '@tanstack/react-query';
import { showError, showSuccess } from '@/shared/lib/toast';
import { useRouter } from '@tanstack/react-router';

interface UseAddPromptOptions {
  onSuccessCallback?: () => void;
}

export function useAddPrompt(options?: UseAddPromptOptions) {
  const queryClient = useQueryClient();
  const createPromptMutation = usePromptsControllerCreate();
  const router = useRouter();
  const form = useForm<CreatePromptFormValues>({
    resolver: zodResolver(createPromptFormSchema),
    defaultValues: {
      title: '',
      content: '',
    },
  });

  function onSubmit(values: CreatePromptFormValues) {
    createPromptMutation.mutate(
      {
        data: {
          title: values.title,
          content: values.content,
        },
      },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({
            queryKey: getPromptsControllerFindAllQueryKey(),
          });
          void router.invalidate();
          showSuccess('Prompt created');
          if (options?.onSuccessCallback) {
            options.onSuccessCallback();
          }
        },
        onError: (error) => {
          console.error('Create prompt failed:', error);
          showError('Create prompt failed');
        },
      },
    );
  }

  return {
    form,
    onSubmit,
    resetForm: () => {
      form.reset();
    },
    isLoading: createPromptMutation.isPending,
  };
}
