import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ArtifactPanelHandle } from '@/shared/model/artifact-panel';
import { useChatSidePanelTransitions } from './useChatSidePanelTransitions';

function setup(isArtifactDetailOpen = true) {
  const openArtifact = vi.fn();
  const toggleArtifactPanel = vi.fn();
  const changeTab = vi.fn();
  let continueExit: (() => void) | undefined;
  const requestExit = vi.fn((onExit: () => void) => {
    continueExit = onExit;
  });
  const artifactPanelRef = {
    current: { requestExit } satisfies ArtifactPanelHandle,
  };
  const { result } = renderHook(() =>
    useChatSidePanelTransitions({
      artifactPanelRef,
      isArtifactDetailOpen,
      openArtifact,
      toggleArtifactPanel,
      changeTab,
    }),
  );
  return {
    result,
    openArtifact,
    toggleArtifactPanel,
    changeTab,
    requestExit,
    confirmExit: () => continueExit?.(),
  };
}

describe('useChatSidePanelTransitions', () => {
  it('waits for the artifact exit guard before opening another artifact', () => {
    const { result, openArtifact, confirmExit } = setup();
    act(() => result.current.openArtifactPanel('artifact-b'));
    expect(openArtifact).not.toHaveBeenCalled();
    act(confirmExit);
    expect(openArtifact).toHaveBeenCalledWith('artifact-b');
  });

  it('waits for the artifact exit guard before toggling the panel', () => {
    const { result, toggleArtifactPanel, confirmExit } = setup();
    act(() => result.current.toggleArtifactPanel());
    expect(toggleArtifactPanel).not.toHaveBeenCalled();
    act(confirmExit);
    expect(toggleArtifactPanel).toHaveBeenCalledOnce();
  });

  it('does not change tabs until the artifact exit guard confirms', () => {
    const { result, changeTab, confirmExit } = setup();

    act(() => result.current.changeTab('context'));
    expect(changeTab).not.toHaveBeenCalled();

    act(confirmExit);
    expect(changeTab).toHaveBeenCalledWith('context');
  });

  it('opens an artifact from the list without requesting an exit', () => {
    const { result, openArtifact, requestExit } = setup(false);
    act(() => result.current.openArtifactPanel('artifact-b'));
    expect(openArtifact).toHaveBeenCalledWith('artifact-b');
    expect(requestExit).not.toHaveBeenCalled();
  });
});
