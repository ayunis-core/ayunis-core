import type { ComponentProps } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatSidePanel } from './ChatSidePanel';
import type { ArtifactSidePanel } from './ArtifactSidePanel';

const featureToggles = vi.hoisted(() => ({
  skillsEnabled: true,
  knowledgeBasesEnabled: true,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/features/feature-toggles', () => ({
  useIsSkillsEnabled: () => featureToggles.skillsEnabled,
  useIsKnowledgeBasesEnabled: () => featureToggles.knowledgeBasesEnabled,
}));

vi.mock('./ArtifactListSidePanel', () => ({
  ArtifactListSidePanel: () => <div>artifact-list</div>,
}));

vi.mock('./ArtifactSidePanel', () => ({
  ArtifactSidePanel: ({ showClose }: { showClose?: boolean }) => (
    <div data-testid="artifact-detail" data-show-close={String(showClose)} />
  ),
}));

vi.mock('./ChatContextSidePanel', () => ({
  ChatContextSidePanel: () => <div>context-content</div>,
}));

const artifactPanelProps = {
  artifact: null,
  onRetry: vi.fn(),
  onSave: vi.fn(),
  onRevert: vi.fn(),
  onExport: vi.fn(),
  onClose: vi.fn(),
  onBack: vi.fn(),
  onLetterheadChange: vi.fn(),
} satisfies ComponentProps<typeof ArtifactSidePanel>;

describe('ChatSidePanel', () => {
  beforeEach(() => {
    featureToggles.skillsEnabled = true;
    featureToggles.knowledgeBasesEnabled = true;
  });

  it('renders a stable tab shell and delegates tab and close transitions', () => {
    const onTabChange = vi.fn();
    const onClose = vi.fn();
    render(
      <ChatSidePanel
        threadId="thread-id"
        view="artifact-list"
        artifactPanelRef={{ current: null }}
        artifactPanelProps={artifactPanelProps}
        onSelectArtifact={vi.fn()}
        onTabChange={onTabChange}
        onClose={onClose}
      />,
    );

    expect(screen.getByTestId('chat-side-panel').id).toBe('chat-side-panel');
    expect(screen.getByRole('tabpanel')).toBeTruthy();
    expect(screen.getByText('artifact-list')).toBeTruthy();
    fireEvent.mouseDown(screen.getByTestId('chat-side-panel-tab-context'), {
      button: 0,
      ctrlKey: false,
    });
    expect(onTabChange).toHaveBeenCalledWith('context');
    fireEvent.click(screen.getByTestId('chat-side-panel-close'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('renders context only on the active context tab', () => {
    render(
      <ChatSidePanel
        threadId="workspace-thread-id"
        view="context"
        artifactPanelRef={{ current: null }}
        artifactPanelProps={artifactPanelProps}
        onSelectArtifact={vi.fn()}
        onTabChange={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText('context-content')).toBeTruthy();
    expect(screen.queryByText('artifact-list')).toBeNull();
  });

  it('shows the artifact list when context becomes unavailable', () => {
    const props = {
      threadId: 'thread-id',
      view: 'context',
      artifactPanelRef: { current: null },
      artifactPanelProps,
      onSelectArtifact: vi.fn(),
      onTabChange: vi.fn(),
      onClose: vi.fn(),
    } as const;
    const { rerender } = render(<ChatSidePanel {...props} />);

    expect(screen.getByText('context-content')).toBeTruthy();

    featureToggles.skillsEnabled = false;
    featureToggles.knowledgeBasesEnabled = false;
    rerender(<ChatSidePanel {...props} />);

    expect(screen.queryByTestId('chat-side-panel-tab-context')).toBeNull();
    expect(screen.getByText('artifact-list')).toBeTruthy();
    expect(screen.queryByText('context-content')).toBeNull();
  });

  it('hides the artifact detail close control because the shell owns closing', () => {
    render(
      <ChatSidePanel
        threadId="thread-id"
        view="artifact-detail"
        artifactPanelRef={{ current: null }}
        artifactPanelProps={artifactPanelProps}
        onSelectArtifact={vi.fn()}
        onTabChange={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByTestId('artifact-detail').dataset.showClose).toBe(
      'false',
    );
  });
});
