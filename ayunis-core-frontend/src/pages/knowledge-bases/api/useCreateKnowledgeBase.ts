import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';
import {
  knowledgeBasesControllerCreate,
  getKnowledgeBasesControllerFindAllQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import { useRouter } from '@tanstack/react-router';
import { showError, showSuccess } from '@/shared/lib/toast';

export type CreateKnowledgeBaseData = {
  name: string;
  description?: string;
};

interface UseCreateKnowledgeBaseOptions {
  onClose?: () => void;
}

export function useCreateKnowledgeBase({
  onClose,
}: UseCreateKnowledgeBaseOptions = {}) {
  const { t } = useTranslation('knowledge-bases');
  const queryClient = useQueryClient();
  const router = useRouter();

  const createKnowledgeBaseSchema = z.object({
    name: z.string().min(1, t('createDialog.validation.nameRequired')).max(255),
    description: z.string().max(2000).optional(),
  });

  const form = useForm<CreateKnowledgeBaseData>({
    resolver: zodResolver(createKnowledgeBaseSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: CreateKnowledgeBaseData) => {
      return await knowledgeBasesControllerCreate({
        name: data.name,
        description: data.description ?? '',
      });
    },
    onSuccess: () => {
      showSuccess(t('create.success'));
      onClose?.();
    },
    onError: () => {
      showError(t('create.error'));
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: getKnowledgeBasesControllerFindAllQueryKey(),
      });
      void router.invalidate();
    },
  });

  const onSubmit = (data: CreateKnowledgeBaseData) => {
    mutation.mutate(data);
  };

  const resetForm = () => {
    form.reset();
  };

  return {
    form,
    onSubmit,
    resetForm,
    isLoading: mutation.isPending,
  };
}
