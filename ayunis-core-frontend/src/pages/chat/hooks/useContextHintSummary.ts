import type { ChatContextSummary } from '@ayunis/chat/surface';
import { useThreadAiContext } from '@/pages/chat/api/useThreadAiContext';
import { useWorkspace } from '@/features/workspaces';

/** What the chat's answers draw on; null until all of it is known. */
export function useContextHintSummary(
  threadId: string,
  workspaceId: string | null,
): ChatContextSummary | null {
  const { context, isLoading, error } = useThreadAiContext(threadId);
  const workspace = useWorkspace(workspaceId);
  const workspaceUnavailable =
    workspaceId !== null &&
    (workspace.isLoading || Boolean(workspace.error) || !workspace.workspace);
  if (isLoading || error || !context || workspaceUnavailable) return null;
  return {
    workspaceName: workspaceId ? workspace.workspace?.name : undefined,
    skills: context.skills.length,
    knowledgeBases: context.knowledgeBases.length,
  };
}
