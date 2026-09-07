import {
  useAddUrl,
  useKnowledgeBaseDocuments,
  useRemoveDocument,
  useUploadDocument,
} from '@/pages/knowledge-base/api';
import { KnowledgeBaseDocumentsCard as SharedKnowledgeBaseDocumentsCard } from '@/widgets/knowledge-base-documents-card';

export default function KnowledgeBaseDocumentsCard({
  knowledgeBaseId,
  disabled = false,
}: Readonly<{ knowledgeBaseId: string; disabled?: boolean }>) {
  const documents = useKnowledgeBaseDocuments(knowledgeBaseId);
  const upload = useUploadDocument(knowledgeBaseId);
  const remove = useRemoveDocument(knowledgeBaseId);
  const addUrl = useAddUrl(knowledgeBaseId);

  return (
    <SharedKnowledgeBaseDocumentsCard
      disabled={disabled}
      controller={{
        ...documents,
        ...upload,
        ...remove,
        ...addUrl,
      }}
    />
  );
}
