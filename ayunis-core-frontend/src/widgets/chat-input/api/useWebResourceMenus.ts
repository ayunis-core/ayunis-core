import { useNavigate } from '@tanstack/react-router';
import type {
  ChatIntegrations,
  ChatKnowledgeBases,
} from '@ayunis/chat/surface';
import { useKnowledgeBases } from '@/widgets/chat-input/api/useKnowledgeBases';
import { useAvailableIntegrations } from '@/widgets/chat-input/api/useAvailableIntegrations';
import { queryStatus } from '@/widgets/chat-input/lib/query-status';

export function useWebKnowledgeBases(
  selection: Pick<ChatKnowledgeBases, 'attached' | 'attach' | 'detach'>,
): ChatKnowledgeBases {
  const navigate = useNavigate();
  const query = useKnowledgeBases({ enabled: true });
  return {
    ...selection,
    items: query.knowledgeBases,
    status: queryStatus(query),
    create: () => void navigate({ to: '/knowledge-bases' }),
  };
}

export function useWebIntegrations(
  selection: Pick<ChatIntegrations, 'attached' | 'attach' | 'detach'>,
): ChatIntegrations {
  const query = useAvailableIntegrations();
  return {
    ...selection,
    items: query.integrations,
    status: queryStatus(query),
  };
}
