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

let routinesEnabled = true;
vi.mock('@/features/feature-toggles', () => ({
  useIsFeatureEnabled: () => routinesEnabled,
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    params,
    ...props
  }: {
    children: ReactNode;
    params: { notificationId: string };
  }) => (
    <a href={`/inbox/${params.notificationId}`} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/widgets/content-area-header/ui/ContentAreaHeader', () => ({
  default: ({ action, badge }: { action: ReactNode; badge: ReactNode }) => (
    <header>
      {badge}
      {action}
    </header>
  ),
}));

function renderHeader(sourceNotificationId: string | null) {
  return render(
    <ChatHeader
      threadId="thread-id"
      isAnonymous={false}
      sourceNotificationId={sourceNotificationId}
      isArtifactPanelOpen={false}
      onToggleArtifactPanel={vi.fn()}
      onRename={vi.fn()}
      onDelete={vi.fn()}
    />,
  );
}

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

  it('links a chat started about a notification back to it', () => {
    routinesEnabled = true;
    renderHeader('notification-id');

    expect(
      screen.getByTestId('chat-source-notification').getAttribute('href'),
    ).toBe('/inbox/notification-id');
  });

  it('shows no notification link for other chats or with routines off', () => {
    routinesEnabled = true;
    const { unmount } = renderHeader(null);
    expect(screen.queryByTestId('chat-source-notification')).toBeNull();
    unmount();

    routinesEnabled = false;
    renderHeader('notification-id');
    expect(screen.queryByTestId('chat-source-notification')).toBeNull();
  });
});
