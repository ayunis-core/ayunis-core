import { Link } from '@tanstack/react-router';
import { Button } from '@ayunis/ui/components/button';
import { useKnowledgeBasesControllerFindAll } from '@/shared/api/generated/ayunisCoreAPI';
import {
  KNOWLEDGE_BASE_BY_DOCUMENT,
  KNOWLEDGE_BASE_IDS,
  type SourceHit,
} from '@/pages/chat-context-prototype/model/mock';

export function KnowledgeBaseLink({ hit }: Readonly<{ hit: SourceHit }>) {
  const realId = useMatchingKnowledgeBaseId(hit.id);

  return (
    <Button variant="outline" size="sm" asChild>
      {realId ? (
        <Link to="/knowledge-bases/$id" params={{ id: realId }}>
          In der Wissenssammlung öffnen
        </Link>
      ) : (
        <Link to="/knowledge-bases">In der Wissenssammlung öffnen</Link>
      )}
    </Button>
  );
}

function useMatchingKnowledgeBaseId(documentId: string): string | undefined {
  const { data } = useKnowledgeBasesControllerFindAll();
  const bases = data?.data ?? [];
  const mockId = KNOWLEDGE_BASE_BY_DOCUMENT[documentId];
  const index = KNOWLEDGE_BASE_IDS.indexOf(mockId);
  return bases[index]?.id ?? bases[0]?.id;
}
