import {
  useKnowledgeBaseDocuments,
  useRemoveDocument,
  useRemoveFailedDocuments,
  useUploadDocument,
} from '@/pages/knowledge-base/api';
import { KnowledgeBaseDocumentsCard as SharedKnowledgeBaseDocumentsCard } from '@/widgets/knowledge-base-documents-card';
import { useSyncedSources } from '@/widgets/knowledge-base-synced-locations';

export default function KnowledgeBaseDocumentsCard({
  knowledgeBaseId,
  disabled = false,
}: Readonly<{ knowledgeBaseId: string; disabled?: boolean }>) {
  const documents = useKnowledgeBaseDocuments(knowledgeBaseId);
  const upload = useUploadDocument(knowledgeBaseId);
  const remove = useRemoveDocument(knowledgeBaseId);
  const removeFailed = useRemoveFailedDocuments(knowledgeBaseId);
  const synced = useSyncedSources(knowledgeBaseId, disabled);

  return (
    <SharedKnowledgeBaseDocumentsCard
      disabled={disabled}
      synced={synced}
      controller={{
        ...documents,
        ...upload,
        ...remove,
        ...removeFailed,
      }}
    />
  );
}
