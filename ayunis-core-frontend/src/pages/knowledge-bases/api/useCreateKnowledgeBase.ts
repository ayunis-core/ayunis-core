import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  getKnowledgeBasesControllerFindAllQueryKey,
  knowledgeBasesControllerCreate,
} from '@/shared/api/generated/ayunisCoreAPI';
import extractErrorData from '@/shared/api/extract-error-data';
import { personalKnowledgeBaseListParams } from '@/shared/api/knowledge-base-scopes';
import { trackOpenPanelEvent } from '@/shared/lib/openpanel-events';
import { showError, showSuccess } from '@/shared/lib/toast';
import type { OwnerSelection } from '@/features/resource-ownership';

export type CreateKnowledgeBaseData = {
  name: string;
  description?: string;
  owner?: OwnerSelection;
};

export function useCreateKnowledgeBase() {
  const { t } = useTranslation('knowledge-bases');
  const queryClient = useQueryClient();
  const router = useRouter();
  const mutation = useMutation({
    mutationFn: (data: CreateKnowledgeBaseData) =>
      knowledgeBasesControllerCreate({
        ...(data.owner ?? { ownerType: 'personal' }),
        name: data.name,
        description: data.description ?? '',
      }),
    onSuccess: (knowledgeBase) => {
      trackOpenPanelEvent('knowledge_base_created', {
        workspace_context: false,
      });
      void queryClient.invalidateQueries({
        queryKey: getKnowledgeBasesControllerFindAllQueryKey(
          personalKnowledgeBaseListParams,
        ),
      });
      void router.invalidate();
      void router.navigate({
        to: '/knowledge-bases/$id',
        params: { id: knowledgeBase.id },
      });
      showSuccess(t('create.success'));
    },
    onError: (error) => {
      try {
        const { code } = extractErrorData(error);
        showError(
          t(
            code === 'VALIDATION_ERROR'
              ? 'create.validationError'
              : 'create.error',
          ),
        );
      } catch {
        showError(t('create.error'));
      }
    },
  });

  return {
    createKnowledgeBase: mutation.mutateAsync,
    isLoading: mutation.isPending,
  };
}
