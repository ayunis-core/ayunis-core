import { useCallback, type RefObject } from 'react';
import type { ArtifactPanelHandle } from '@/shared/model/artifact-panel';

interface ChatSidePanelTransitionOptions {
  artifactPanelRef: RefObject<ArtifactPanelHandle | null>;
  isArtifactDetailOpen: boolean;
  openArtifact: (artifactId: string) => void;
  toggleArtifactPanel: () => void;
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
  openArtifact,
  toggleArtifactPanel,
}: ChatSidePanelTransitionOptions) {
  const requestArtifactExit = useArtifactExitRequest(
    artifactPanelRef,
    isArtifactDetailOpen,
  );

  const openArtifactPanel = useCallback(
    (artifactId: string) => requestArtifactExit(() => openArtifact(artifactId)),
    [openArtifact, requestArtifactExit],
  );

  const toggleArtifactPanelView = useCallback(
    () => requestArtifactExit(toggleArtifactPanel),
    [requestArtifactExit, toggleArtifactPanel],
  );

  return {
    openArtifactPanel,
    toggleArtifactPanel: toggleArtifactPanelView,
  };
}
