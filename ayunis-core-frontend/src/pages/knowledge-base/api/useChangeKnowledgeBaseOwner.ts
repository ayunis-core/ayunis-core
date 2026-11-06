import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  ownerChangeErrorKey,
  type OwnerSelection,
} from '@/features/resource-ownership';
import {
  getKnowledgeBasesControllerFindAllQueryKey,
  getKnowledgeBasesControllerFindOneQueryKey,
  knowledgeBaseOwnerControllerChangeOwner,
  knowledgeBaseOwnerControllerPreviewOwnerChange,
} from '@/shared/api/generated/ayunisCoreAPI';
import { personalKnowledgeBaseListParams } from '@/shared/api/knowledge-base-scopes';
import { showError, showSuccess } from '@/shared/lib/toast';

export function useChangeKnowledgeBaseOwner(knowledgeBaseId: string) {
  const { t } = useTranslation('ownership');
  const queryClient = useQueryClient();
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: (owner: OwnerSelection) =>
      knowledgeBaseOwnerControllerChangeOwner(knowledgeBaseId, owner),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: getKnowledgeBasesControllerFindAllQueryKey(
          personalKnowledgeBaseListParams,
        ),
      });
      void queryClient.invalidateQueries({
        queryKey: getKnowledgeBasesControllerFindOneQueryKey(knowledgeBaseId),
      });
      // Skills of other owners lose the link; which ones is unknown here.
      void queryClient.invalidateQueries({
        predicate: ({ queryKey }) =>
          typeof queryKey[0] === 'string' &&
          /^\/skills\/[^/]+\/knowledge-bases$/.test(queryKey[0]),
      });
      void router.invalidate();
      showSuccess(t('change.success'));
    },
    onError: (error) => {
      showError(t(ownerChangeErrorKey(error)));
    },
  });

  const previewOwnerChange = async (owner: OwnerSelection) => {
    try {
      const preview = await knowledgeBaseOwnerControllerPreviewOwnerChange(
        knowledgeBaseId,
        owner,
      );
      return preview.unlinkedSkillCount;
    } catch (error) {
      showError(t(ownerChangeErrorKey(error)));
      throw error;
    }
  };

  return {
    changeOwner: mutation.mutateAsync,
    previewOwnerChange,
    isPending: mutation.isPending,
  };
}
