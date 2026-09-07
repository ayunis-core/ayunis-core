import { useCallback, type RefObject } from 'react';
import type { ArtifactPanelHandle } from '@/shared/model/artifact-panel';
import type { WorkspaceContextPanel } from '@/pages/chat/ui/WorkspaceContextSidePanel';

interface ChatSidePanelTransitionOptions {
  artifactPanelRef: RefObject<ArtifactPanelHandle | null>;
  isArtifactDetailOpen: boolean;
  isArtifactPanelOpen: boolean;
  closeArtifactPanel: () => void;
  openArtifact: (artifactId: string) => void;
  toggleArtifactPanel: () => void;
  closeWorkspacePanel: () => void;
  toggleWorkspacePanel: (panel: WorkspaceContextPanel) => void;
}

function useArtifactExitRequest(
  artifactPanelRef: RefObject<ArtifactPanelHandle | null>,
  isArtifactDetailOpen: boolean,
) {
  return useCallback(
    (onExit: () => void) => {
      if (isArtifactDetailOpen && artifactPanelRef.current) {
        artifactPanelRef.current.requestExit(onExit);
        return;
      }
      onExit();
    },
    [artifactPanelRef, isArtifactDetailOpen],
  );
}

export function useChatSidePanelTransitions({
  artifactPanelRef,
  isArtifactDetailOpen,
  isArtifactPanelOpen,
  closeArtifactPanel,
  openArtifact,
  toggleArtifactPanel,
  closeWorkspacePanel,
  toggleWorkspacePanel,
}: ChatSidePanelTransitionOptions) {
  const requestArtifactExit = useArtifactExitRequest(
    artifactPanelRef,
    isArtifactDetailOpen,
  );

  const openArtifactPanel = useCallback(
    (artifactId: string) =>
      requestArtifactExit(() => {
        closeWorkspacePanel();
        openArtifact(artifactId);
      }),
    [closeWorkspacePanel, openArtifact, requestArtifactExit],
  );

  const toggleArtifactPanelView = useCallback(
    () =>
      requestArtifactExit(() => {
        closeWorkspacePanel();
        toggleArtifactPanel();
      }),
    [closeWorkspacePanel, requestArtifactExit, toggleArtifactPanel],
  );

  const toggleWorkspaceContextPanel = useCallback(
    (panel: WorkspaceContextPanel) =>
      requestArtifactExit(() => {
        if (isArtifactPanelOpen) closeArtifactPanel();
        toggleWorkspacePanel(panel);
      }),
    [
      closeArtifactPanel,
      isArtifactPanelOpen,
      requestArtifactExit,
      toggleWorkspacePanel,
    ],
  );

  return {
    openArtifactPanel,
    toggleArtifactPanel: toggleArtifactPanelView,
    toggleWorkspaceContextPanel,
  };
}
