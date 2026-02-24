import { useKnowledgeBasesControllerListDocuments } from '@/shared/api/generated/ayunisCoreAPI';

export function useKnowledgeBaseDocuments(id: string) {
  const { data, isLoading } = useKnowledgeBasesControllerListDocuments(id);
  return { documents: data?.data ?? [], isLoading };
}
