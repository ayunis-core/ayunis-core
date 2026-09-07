import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useArtifactActions } from './useArtifactActions';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/pages/chat/api/useArtifact', () => ({
  useArtifact: () => ({
    artifact: null,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/pages/chat/api/useUpdateArtifact', () => ({
  useUpdateArtifact: () => ({ updateArtifactAsync: vi.fn() }),
}));

vi.mock('@/pages/chat/api/useRevertArtifact', () => ({
  useRevertArtifact: () => ({ revertArtifact: vi.fn() }),
}));

vi.mock('@/pages/chat/api/useExportArtifact', () => ({
  useExportArtifact: () => ({ exportArtifact: vi.fn(), isExporting: false }),
}));

vi.mock('@/shared/lib/toast', () => ({ showSuccess: vi.fn() }));

describe('useArtifactActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('waits for navigation before showing artifact detail', () => {
    const { result, rerender } = renderHook(
      ({ artifactId }: { artifactId?: string }) =>
        useArtifactActions('thread-id', artifactId),
      { initialProps: { artifactId: undefined as string | undefined } },
    );

    act(() => result.current.handleOpenArtifact('artifact-id'));

    expect(result.current.isArtifactPanelOpen).toBe(false);
    expect(result.current.isArtifactListView).toBe(false);

    rerender({ artifactId: 'artifact-id' });
    expect(result.current.isArtifactPanelOpen).toBe(true);
    expect(result.current.isArtifactListView).toBe(false);
  });

  it('moves between a closed panel, the list, and artifact detail', () => {
    const { result, rerender } = renderHook(
      ({ artifactId }: { artifactId?: string }) =>
        useArtifactActions('thread-id', artifactId),
      { initialProps: { artifactId: undefined as string | undefined } },
    );

    act(() => result.current.handleToggleArtifactPanel());
    expect(result.current.isArtifactPanelOpen).toBe(true);
    expect(result.current.isArtifactListView).toBe(true);

    act(() => result.current.handleOpenArtifact('artifact-id'));
    expect(mocks.navigate).toHaveBeenLastCalledWith({
      to: '/chats/$threadId',
      params: { threadId: 'thread-id' },
      search: { artifactId: 'artifact-id' },
      replace: true,
    });

    rerender({ artifactId: 'artifact-id' });
    expect(result.current.isArtifactListView).toBe(false);

    act(() => result.current.handleBackToArtifactList());
    rerender({ artifactId: undefined });
    expect(result.current.isArtifactPanelOpen).toBe(true);
    expect(result.current.isArtifactListView).toBe(true);

    act(() => result.current.handleToggleArtifactPanel());
    expect(result.current.isArtifactPanelOpen).toBe(false);
  });
});
