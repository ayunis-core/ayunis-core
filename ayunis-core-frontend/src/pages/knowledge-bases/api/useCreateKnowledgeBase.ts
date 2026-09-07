import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  getKnowledgeBasesControllerFindAllQueryKey,
  knowledgeBasesControllerCreate,
} from '@/shared/api/generated/ayunisCoreAPI';
import { showError, showSuccess } from '@/shared/lib/toast';

export type CreateKnowledgeBaseData = {
  name: string;
  description?: string;
};

export function useCreateKnowledgeBase() {
  const { t } = useTranslation('knowledge-bases');
  const queryClient = useQueryClient();
  const router = useRouter();
  const mutation = useMutation({
    mutationFn: (data: CreateKnowledgeBaseData) =>
      knowledgeBasesControllerCreate({
        name: data.name,
        description: data.description ?? '',
      }),
    onSuccess: () => showSuccess(t('create.success')),
    onError: () => showError(t('create.error')),
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: getKnowledgeBasesControllerFindAllQueryKey(),
      });
      void router.invalidate();
    },
  });

  return {
    createKnowledgeBase: mutation.mutateAsync,
    isLoading: mutation.isPending,
  };
}
