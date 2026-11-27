import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  getThreadsControllerFindAllQueryKey,
  getThreadsControllerFindOneQueryKey,
  getWorkspacesControllerFindAllQueryKey,
  getWorkspacesControllerFindOneQueryKey,
} from '@ayunis/api-client/endpoints';
import type { ChatStarted } from '@ayunis/chat/surface';
import {
  threadInteractionContext,
  trackOpenPanelEvent,
} from '@/shared/lib/openpanel-events';

function trackChatStarted({
  thread,
  sources,
  knowledgeBases,
  integrations,
  skillId,
  origin,
}: ChatStarted): void {
  trackOpenPanelEvent('chat_started', {
    ...threadInteractionContext({
      ...thread,
      sources,
      knowledgeBases,
      mcpIntegrations: integrations,
    }),
    has_skill: Boolean(skillId),
  });
  if (origin?.kind === 'onboarding') {
    trackOpenPanelEvent('onboarding_chat_started', { stage: origin.stage });
  }
}

/** Opens a chat the package started, once its new-chat screen has settled. */
export function useWebChatStarted(): (started: ChatStarted) => void {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  return (started) => {
    void started.settled.then((stands) => {
      if (!stands) return;
      const { id, workspaceId } = started.thread;
      void queryClient.invalidateQueries({
        queryKey: getThreadsControllerFindAllQueryKey(),
      });
      void queryClient.invalidateQueries({
        queryKey: getThreadsControllerFindOneQueryKey(id),
      });
      if (workspaceId) {
        // The workspace list is ordered by chat activity, so it must refetch.
        void queryClient.invalidateQueries({
          queryKey: getWorkspacesControllerFindAllQueryKey(),
        });
        void queryClient.invalidateQueries({
          queryKey: getWorkspacesControllerFindOneQueryKey(workspaceId),
        });
      }
      trackChatStarted(started);
      void navigate({ to: '/chats/$threadId', params: { threadId: id } });
    });
  };
}
