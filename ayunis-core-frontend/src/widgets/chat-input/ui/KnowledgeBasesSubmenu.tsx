import { useNavigate } from '@tanstack/react-router';
import { KnowledgeBasesMenuAction } from '@ayunis/chat/surface';
import type { KnowledgeBaseSummary } from '@/shared/contexts/chat/chatContext';
import { useKnowledgeBases } from '@/widgets/chat-input/api/useKnowledgeBases';
import { queryStatus } from '@/widgets/chat-input/lib/query-status';

export function KnowledgeBasesSubmenu({
  onKnowledgeBaseSelect,
  attachedKnowledgeBaseIds,
}: Readonly<{
  onKnowledgeBaseSelect: (knowledgeBase: KnowledgeBaseSummary) => void;
  attachedKnowledgeBaseIds: string[];
}>) {
  const navigate = useNavigate();
  const query = useKnowledgeBases({ enabled: true });
  return (
    <KnowledgeBasesMenuAction
      items={query.knowledgeBases}
      status={queryStatus(query)}
      attachedIds={attachedKnowledgeBaseIds}
      onSelect={onKnowledgeBaseSelect}
      onCreate={() => void navigate({ to: '/knowledge-bases' })}
    />
  );
}
