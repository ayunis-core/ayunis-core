import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useContextHintSummary } from './useContextHintSummary';

const mocks = vi.hoisted(() => ({
  useThreadAiContext: vi.fn(),
  workspace: { id: 'workspace-id', name: 'Finance' },
  workspaceLoading: false,
  workspaceError: null as Error | null,
}));

vi.mock('@/pages/chat/api/useThreadAiContext', () => ({
  useThreadAiContext: mocks.useThreadAiContext,
}));

vi.mock('@/features/workspaces', () => ({
  useWorkspace: () => ({
    workspace: mocks.workspace,
    isLoading: mocks.workspaceLoading,
    error: mocks.workspaceError,
  }),
}));

function summary(workspaceId: string | null) {
  return renderHook(() => useContextHintSummary('thread-id', workspaceId))
    .result.current;
}

describe('useContextHintSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.workspace = { id: 'workspace-id', name: 'Finance' };
    mocks.workspaceLoading = false;
    mocks.workspaceError = null;
    mocks.useThreadAiContext.mockReturnValue({
      context: {
        skills: [{ id: 'skill-a' }, { id: 'skill-b' }],
        knowledgeBases: [{ id: 'kb-a' }],
      },
      isLoading: false,
      error: null,
    });
  });

  it('counts the workspace context of a chat in a workspace', () => {
    expect(summary('workspace-id')).toEqual({
      workspaceName: 'Finance',
      skills: 2,
      knowledgeBases: 1,
    });
    expect(mocks.useThreadAiContext).toHaveBeenCalledWith('thread-id');
  });

  it('counts the personal context of a chat outside a workspace', () => {
    expect(summary(null)).toEqual({
      workspaceName: undefined,
      skills: 2,
      knowledgeBases: 1,
    });
  });

  it('shows nothing while context or workspace data is unavailable', () => {
    mocks.useThreadAiContext.mockReturnValue({
      context: undefined,
      isLoading: true,
      error: null,
    });
    expect(summary(null)).toBeNull();

    mocks.useThreadAiContext.mockReturnValue({
      context: undefined,
      isLoading: false,
      error: new Error('failed'),
    });
    expect(summary(null)).toBeNull();

    mocks.useThreadAiContext.mockReturnValue({
      context: { skills: [], knowledgeBases: [] },
      isLoading: false,
      error: null,
    });
    mocks.workspaceError = new Error('failed');
    expect(summary('workspace-id')).toBeNull();
  });
});
