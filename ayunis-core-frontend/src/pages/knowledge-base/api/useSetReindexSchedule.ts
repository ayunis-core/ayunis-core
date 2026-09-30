import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { showError, showSuccess } from '@/shared/lib/toast';
import {
  useKnowledgeBasesControllerSetDocumentReindexSchedule,
  getKnowledgeBasesControllerListDocumentsQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { ReindexIntervalDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import {
  isDocumentFormFieldError,
  reindexScheduleErrorKey,
} from '@/widgets/knowledge-base-documents-card/lib/document-form-errors';

export function useSetReindexSchedule(knowledgeBaseId: string) {
  const { t } = useTranslation('knowledge-bases');
  const queryClient = useQueryClient();

  const mutation = useKnowledgeBasesControllerSetDocumentReindexSchedule({
    mutation: {
      onSuccess: (document) => {
        void queryClient.invalidateQueries({
          queryKey:
            getKnowledgeBasesControllerListDocumentsQueryKey(knowledgeBaseId),
        });
        showSuccess(
          t(
            document.reindexInterval
              ? 'detail.documents.reindex.saved'
              : 'detail.documents.reindex.removed',
          ),
        );
      },
      onError: (error: unknown) => {
        // The dialog shows these on its fields.
        if (isDocumentFormFieldError(error)) return;
        showError(t(reindexScheduleErrorKey(error)));
      },
    },
  });

  const setReindexScheduleAsync = async (
    documentId: string,
    reindexInterval: ReindexIntervalDto | null,
  ) => {
    await mutation.mutateAsync({
      id: knowledgeBaseId,
      documentId,
      data: { reindexInterval },
    });
  };

  return {
    setReindexScheduleAsync,
    isSettingReindexSchedule: mutation.isPending,
  };
}
