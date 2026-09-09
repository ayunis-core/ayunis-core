import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatContextSidePanel } from './ChatContextSidePanel';

const mocks = vi.hoisted(() => ({
  useThreadAiContext: vi.fn(),
  refetch: vi.fn(),
  skillsEnabled: true,
  knowledgeBasesEnabled: true,
}));

vi.mock('@/pages/chat/api/useThreadAiContext', () => ({
  useThreadAiContext: mocks.useThreadAiContext,
}));

vi.mock('@/features/feature-toggles', () => ({
  useIsSkillsEnabled: () => mocks.skillsEnabled,
  useIsKnowledgeBasesEnabled: () => mocks.knowledgeBasesEnabled,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { count?: number }) =>
      options?.count === undefined ? key : `${key}:${options.count}`,
  }),
}));

describe('ChatContextSidePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.skillsEnabled = true;
    mocks.knowledgeBasesEnabled = true;
    mocks.useThreadAiContext.mockReturnValue({
      context: {
        skills: [
          {
            id: 'personal-skill',
            name: 'Same name',
            shortDescription: 'Personal description',
            workspaceId: null,
          },
          {
            id: 'workspace-skill',
            name: 'Same name',
            shortDescription: 'Workspace description',
            workspaceId: 'workspace-id',
          },
        ],
        knowledgeBases: [
          {
            id: 'personal-kb',
            name: 'Same knowledge',
            documentCount: 1,
            workspaceId: null,
          },
          {
            id: 'workspace-kb',
            name: 'Same knowledge',
            documentCount: 3,
            workspaceId: 'workspace-id',
          },
        ],
      },
      isLoading: false,
      error: null,
      refetch: mocks.refetch,
    });
  });

  it('hides the skills section when skills are disabled', () => {
    mocks.skillsEnabled = false;

    render(<ChatContextSidePanel threadId="thread-id" />);

    expect(screen.queryByTestId('chat-context-section-skills')).toBeNull();
    expect(
      screen.getByTestId('chat-context-section-knowledge-bases'),
    ).not.toBeNull();
  });

  it('hides the knowledge-base section when knowledge bases are disabled', () => {
    mocks.knowledgeBasesEnabled = false;

    render(<ChatContextSidePanel threadId="thread-id" />);

    expect(
      screen.queryByTestId('chat-context-section-knowledge-bases'),
    ).toBeNull();
    expect(screen.getByTestId('chat-context-section-skills')).not.toBeNull();
  });

  it('renders exactly the skills and knowledge-base sections without deduplicating names', () => {
    const { container } = render(<ChatContextSidePanel threadId="thread-id" />);

    expect(container.querySelectorAll('section')).toHaveLength(2);
    expect(screen.getByTestId('chat-context-section-skills')).toBeTruthy();
    expect(
      screen.getByTestId('chat-context-section-knowledge-bases'),
    ).toBeTruthy();
    expect(screen.getAllByText('Same name')).toHaveLength(2);
    expect(screen.getAllByText('Same knowledge')).toHaveLength(2);
    expect(screen.getByText('Personal description')).toBeTruthy();
    expect(screen.getByText('Workspace description')).toBeTruthy();
    expect(
      screen.getByText('chat.context.knowledgeBases.documents:1'),
    ).toBeTruthy();
    expect(
      screen.getByText('chat.context.knowledgeBases.documents:3'),
    ).toBeTruthy();
  });

  it('marks workspace resources independently from same-name personal resources', () => {
    render(<ChatContextSidePanel threadId="thread-id" />);

    expect(
      screen.queryByTestId('chat-context-skill-scope-personal-skill'),
    ).toBeNull();
    expect(
      screen.getByTestId('chat-context-skill-scope-workspace-skill'),
    ).toBeTruthy();
    expect(
      screen.getByTestId('chat-context-knowledge-base-scope-workspace-kb'),
    ).toBeTruthy();
  });

  it('renders loading, error with retry, and section empty states', () => {
    mocks.useThreadAiContext.mockReturnValueOnce({
      context: undefined,
      isLoading: true,
      error: null,
      refetch: mocks.refetch,
    });
    const { rerender } = render(<ChatContextSidePanel threadId="thread-id" />);
    expect(screen.getByTestId('chat-context-loading')).toBeTruthy();

    mocks.useThreadAiContext.mockReturnValueOnce({
      context: undefined,
      isLoading: false,
      error: new Error('failed'),
      refetch: mocks.refetch,
    });
    rerender(<ChatContextSidePanel threadId="thread-id" />);
    expect(screen.getByTestId('chat-context-error')).toBeTruthy();
    fireEvent.click(screen.getByTestId('chat-context-retry'));
    expect(mocks.refetch).toHaveBeenCalledOnce();

    mocks.useThreadAiContext.mockReturnValueOnce({
      context: { skills: [], knowledgeBases: [] },
      isLoading: false,
      error: null,
      refetch: mocks.refetch,
    });
    rerender(<ChatContextSidePanel threadId="thread-id" />);
    expect(screen.getByTestId('chat-context-skills-empty')).toBeTruthy();
    expect(
      screen.getByTestId('chat-context-knowledge-bases-empty'),
    ).toBeTruthy();
  });
});
