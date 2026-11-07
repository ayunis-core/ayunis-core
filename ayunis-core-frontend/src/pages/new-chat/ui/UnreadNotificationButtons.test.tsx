import type { ReactNode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type * as Notifications from '@/features/notifications';
import { UnreadNotificationButtons } from './UnreadNotificationButtons';

const mocks = vi.hoisted(() => ({
  unreadByType: [] as { type: string; count: number }[],
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { count?: number }) =>
      `${key}:${options?.count}`,
  }),
}));
vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    search,
    ...props
  }: {
    children: ReactNode;
    search: { type: string };
  }) => (
    <a href={`/inbox?type=${search.type}`} {...props}>
      {children}
    </a>
  ),
}));
vi.mock('@/features/notifications', async (importOriginal) => ({
  ...(await importOriginal<typeof Notifications>()),
  useUnreadNotificationCount: () => ({
    unreadCount: mocks.unreadByType.reduce((sum, { count }) => sum + count, 0),
    unreadByType: mocks.unreadByType,
  }),
}));

afterEach(cleanup);

function buttons(): HTMLAnchorElement[] {
  return screen.queryAllByTestId('new-chat-unread-notifications-button');
}

describe('UnreadNotificationButtons', () => {
  it('shows one button per type with unread notifications, with its count and a link to the inbox filtered to it', () => {
    mocks.unreadByType = [
      { type: 'routine', count: 3 },
      { type: 'routine_error', count: 1 },
    ];

    render(<UnreadNotificationButtons isCollapsed={false} />);

    expect(buttons().map((button) => button.dataset.type)).toEqual([
      'routine',
      'routine_error',
    ]);
    expect(buttons().map((button) => button.getAttribute('href'))).toEqual([
      '/inbox?type=routine',
      '/inbox?type=routine_error',
    ]);
    expect(
      screen
        .getAllByTestId('new-chat-unread-notifications-count')
        .map((badge) => badge.textContent),
    ).toEqual(['3', '1']);
    expect(buttons()[0].getAttribute('aria-label')).toBe(
      'newChat.unreadNotifications.routine:3',
    );
  });

  it('shows no button for a type without unread notifications', () => {
    mocks.unreadByType = [{ type: 'routine_error', count: 2 }];

    render(<UnreadNotificationButtons isCollapsed={false} />);

    expect(buttons().map((button) => button.dataset.type)).toEqual([
      'routine_error',
    ]);
  });

  it('renders nothing when nothing is unread', () => {
    mocks.unreadByType = [];

    render(<UnreadNotificationButtons isCollapsed={false} />);

    expect(screen.queryByTestId('new-chat-unread-notifications')).toBeNull();
  });

  it('ignores a type the app has no icon for', () => {
    mocks.unreadByType = [{ type: 'release_notes', count: 2 }];

    render(<UnreadNotificationButtons isCollapsed={false} />);

    expect(screen.queryByTestId('new-chat-unread-notifications')).toBeNull();
  });

  it('hides the row from assistive technology while it collapses for a new chat', () => {
    mocks.unreadByType = [{ type: 'routine', count: 1 }];

    const { rerender } = render(
      <UnreadNotificationButtons isCollapsed={false} />,
    );
    const row = screen.getByTestId('new-chat-unread-notifications');
    expect(row.getAttribute('aria-hidden')).toBe('false');

    rerender(<UnreadNotificationButtons isCollapsed />);
    expect(row.getAttribute('aria-hidden')).toBe('true');
    expect(row.className).toContain('new-chat-dock-extras--collapsed');
    expect(row.className).toContain('overflow-hidden');
  });
});
