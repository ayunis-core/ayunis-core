import { useCallback, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import type {
  ChatSidePanelTab,
  ChatSidePanelView,
} from '@/pages/chat/model/chat-side-panel';

function useArtifactNavigation(threadId: string) {
  const navigate = useNavigate();
  return useCallback(
    (artifactId?: string) => {
      void navigate({
        to: '/chats/$threadId',
        params: { threadId },
        search: { artifactId },
        replace: true,
      });
    },
    [navigate, threadId],
  );
}

export function useChatSidePanelState(threadId: string, artifactId?: string) {
  const navigateToArtifact = useArtifactNavigation(threadId);
  const [panelView, setPanelView] = useState<{
    threadId: string;
    tab: ChatSidePanelTab;
  } | null>(null);
  const localPanelView = panelView?.threadId === threadId ? panelView : null;
  const view: ChatSidePanelView = artifactId
    ? 'artifact-detail'
    : getLocalPanelView(localPanelView);

  const openArtifact = useCallback(
    (nextArtifactId: string) => navigateToArtifact(nextArtifactId),
    [navigateToArtifact],
  );
  const close = useCallback(() => {
    setPanelView(null);
    navigateToArtifact();
  }, [navigateToArtifact]);
  const openTab = useCallback(
    (tab: ChatSidePanelTab) => {
      setPanelView({ threadId, tab });
      navigateToArtifact();
    },
    [navigateToArtifact, threadId],
  );
  const toggle = useCallback(() => {
    if (artifactId || localPanelView) {
      close();
      return;
    }
    setPanelView({ threadId, tab: 'artifacts' });
  }, [artifactId, close, localPanelView, threadId]);

  return {
    view,
    isOpen: Boolean(artifactId) || Boolean(localPanelView),
    openArtifact,
    openTab,
    close,
    toggle,
  };
}

function getLocalPanelView(
  panelView: { tab: ChatSidePanelTab } | null,
): ChatSidePanelView {
  return panelView?.tab === 'context' ? 'context' : 'artifact-list';
}
