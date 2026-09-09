import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatContextHint } from './ChatContextHint';

const mocks = vi.hoisted(() => ({
  useThreadAiContext: vi.fn(),
  workspace: { id: 'workspace-id', name: 'Finance' },
  workspaceLoading: false,
  workspaceError: null as Error | null,
  skillsEnabled: true,
  knowledgeBasesEnabled: true,
  workspacesEnabled: true,
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

vi.mock('@/features/feature-toggles', () => ({
  useIsSkillsEnabled: () => mocks.skillsEnabled,
  useIsKnowledgeBasesEnabled: () => mocks.knowledgeBasesEnabled,
  useIsWorkspacesEnabled: () => mocks.workspacesEnabled,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { count?: number; name?: string }) => {
      if (key === 'chat.context.hint.personal') return 'Personal context';
      if (key === 'chat.context.hint.open') return 'Open chat context';
      if (key === 'chat.context.hint.workspace') {
        return `Workspace: ${options?.name}`;
      }
      if (key === 'chat.context.hint.skills') {
        return `${options?.count} ${options?.count === 1 ? 'skill' : 'skills'}`;
      }
      if (key === 'chat.context.hint.knowledgeBases') {
        return `${options?.count} ${options?.count === 1 ? 'knowledge base' : 'knowledge bases'}`;
      }
      return key;
    },
  }),
}));

describe('ChatContextHint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.workspace = { id: 'workspace-id', name: 'Finance' };
    mocks.workspaceLoading = false;
    mocks.workspaceError = null;
    mocks.skillsEnabled = true;
    mocks.knowledgeBasesEnabled = true;
    mocks.workspacesEnabled = true;
    mocks.useThreadAiContext.mockReturnValue({
      context: {
        skills: [{ id: 'skill-a' }, { id: 'skill-b' }],
        knowledgeBases: [{ id: 'kb-a' }],
      },
      isLoading: false,
      error: null,
    });
  });

  it('shows workspace context counts and opens the context panel', () => {
    const onOpen = vi.fn();

    render(
      <ChatContextHint
        threadId="thread-id"
        workspaceId="workspace-id"
        onOpen={onOpen}
      />,
    );

    expect(screen.getByText('Workspace: Finance')).toBeTruthy();
    expect(screen.getByText('2 skills')).toBeTruthy();
    expect(screen.getByText('1 knowledge base')).toBeTruthy();

    const hint = screen.getByRole('button', { name: /Open chat context/ });
    expect(hint.getAttribute('aria-controls')).toBe('chat-side-panel');
    fireEvent.click(hint);

    expect(onOpen).toHaveBeenCalledOnce();
    expect(mocks.useThreadAiContext).toHaveBeenCalledWith('thread-id', true);
  });

  it('shows personal context with zero counts while workspaces are disabled', () => {
    mocks.workspacesEnabled = false;
    mocks.useThreadAiContext.mockReturnValue({
      context: { skills: [], knowledgeBases: [] },
      isLoading: false,
      error: null,
    });

    render(
      <ChatContextHint
        threadId="thread-id"
        workspaceId={null}
        onOpen={vi.fn()}
      />,
    );

    expect(screen.getByText('Personal context')).toBeTruthy();
    expect(screen.getByText('0 skills')).toBeTruthy();
    expect(screen.getByText('0 knowledge bases')).toBeTruthy();
  });

  it('omits context types that are disabled', () => {
    mocks.skillsEnabled = false;

    render(
      <ChatContextHint
        threadId="thread-id"
        workspaceId={null}
        onOpen={vi.fn()}
      />,
    );

    expect(screen.queryByText(/skills?$/)).toBeNull();
    expect(screen.getByText('1 knowledge base')).toBeTruthy();
  });

  it('does not block the timeline while context or workspace data is unavailable', () => {
    mocks.useThreadAiContext.mockReturnValue({
      context: undefined,
      isLoading: true,
      error: null,
    });
    const { rerender } = render(
      <ChatContextHint
        threadId="thread-id"
        workspaceId={null}
        onOpen={vi.fn()}
      />,
    );
    expect(screen.queryByTestId('chat-context-hint')).toBeNull();

    mocks.useThreadAiContext.mockReturnValue({
      context: undefined,
      isLoading: false,
      error: new Error('failed'),
    });
    rerender(
      <ChatContextHint
        threadId="thread-id"
        workspaceId={null}
        onOpen={vi.fn()}
      />,
    );
    expect(screen.queryByTestId('chat-context-hint')).toBeNull();

    mocks.useThreadAiContext.mockReturnValue({
      context: { skills: [], knowledgeBases: [] },
      isLoading: false,
      error: null,
    });
    mocks.workspaceError = new Error('failed');
    rerender(
      <ChatContextHint
        threadId="thread-id"
        workspaceId="workspace-id"
        onOpen={vi.fn()}
      />,
    );

    expect(screen.queryByTestId('chat-context-hint')).toBeNull();
  });
});
