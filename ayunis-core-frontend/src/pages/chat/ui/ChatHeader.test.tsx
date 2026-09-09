import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ChatHeader from './ChatHeader';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/features/favorites', () => ({
  isFavorite: () => false,
  useFavorites: () => ({ favorites: [] }),
  useToggleFavorite: () => ({ toggle: vi.fn() }),
}));

vi.mock('@/features/workspaces', () => ({
  useWorkspaces: () => ({ workspaces: [] }),
}));

vi.mock('@/features/feature-toggles', () => ({
  useIsWorkspacesEnabled: () => false,
}));

vi.mock('@/widgets/content-area-header/ui/ContentAreaHeader', () => ({
  default: ({ action }: { action: ReactNode }) => <header>{action}</header>,
}));

describe('ChatHeader', () => {
  it('opens the chat side panel from its header button', () => {
    const onToggleArtifactPanel = vi.fn();

    render(
      <ChatHeader
        threadId="thread-id"
        isAnonymous={false}
        isArtifactPanelOpen={false}
        onToggleArtifactPanel={onToggleArtifactPanel}
        onRename={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const button = screen.getByRole('button', {
      name: 'chat.sidePanel.open',
    });
    expect(button.getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(button);

    expect(onToggleArtifactPanel).toHaveBeenCalledOnce();
  });
});
