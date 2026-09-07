import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ArtifactPanelHandle } from '@/shared/model/artifact-panel';
import { useChatSidePanelTransitions } from './useChatSidePanelTransitions';

function createCallbacks() {
  return {
    closeArtifactPanel: vi.fn(),
    openArtifact: vi.fn(),
    toggleArtifactPanel: vi.fn(),
    closeWorkspacePanel: vi.fn(),
    toggleWorkspacePanel: vi.fn(),
  };
}

describe('useChatSidePanelTransitions', () => {
  it('waits for the artifact exit guard before opening another artifact', () => {
    const callbacks = createCallbacks();
    let continueExit: (() => void) | undefined;
    const artifactPanelRef = {
      current: {
        requestExit: (onExit: () => void) => {
          continueExit = onExit;
        },
      } satisfies ArtifactPanelHandle,
    };
    const { result } = renderHook(() =>
      useChatSidePanelTransitions({
        ...callbacks,
        artifactPanelRef,
        isArtifactDetailOpen: true,
        isArtifactPanelOpen: true,
      }),
    );

    act(() => result.current.openArtifactPanel('artifact-b'));
    expect(callbacks.openArtifact).not.toHaveBeenCalled();

    act(() => continueExit?.());
    expect(callbacks.closeWorkspacePanel).toHaveBeenCalledOnce();
    expect(callbacks.openArtifact).toHaveBeenCalledWith('artifact-b');
  });

  it('does not switch to workspace context until artifact exit is confirmed', () => {
    const callbacks = createCallbacks();
    let continueExit: (() => void) | undefined;
    const artifactPanelRef = {
      current: {
        requestExit: (onExit: () => void) => {
          continueExit = onExit;
        },
      } satisfies ArtifactPanelHandle,
    };
    const { result } = renderHook(() =>
      useChatSidePanelTransitions({
        ...callbacks,
        artifactPanelRef,
        isArtifactDetailOpen: true,
        isArtifactPanelOpen: true,
      }),
    );

    act(() => result.current.toggleWorkspaceContextPanel('knowledge'));
    expect(callbacks.toggleWorkspacePanel).not.toHaveBeenCalled();

    act(() => continueExit?.());
    expect(callbacks.closeArtifactPanel).toHaveBeenCalledOnce();
    expect(callbacks.toggleWorkspacePanel).toHaveBeenCalledWith('knowledge');
  });
});
