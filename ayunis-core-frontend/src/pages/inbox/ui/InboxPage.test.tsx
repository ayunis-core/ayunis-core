import type { ReactNode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import InboxPage from './InboxPage';

const mocks = vi.hoisted(() => ({
  notifications: [] as { id: string; readAt: string | null }[],
  unreadCount: 0,
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/layouts/app-layout', () => ({
  default: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('@/layouts/content-area-layout/ui/ContentAreaLayout', () => ({
  default: ({
    contentHeader,
    contentArea,
  }: {
    contentHeader: ReactNode;
    contentArea: ReactNode;
  }) => (
    <>
      {contentHeader}
      {contentArea}
    </>
  ),
}));
vi.mock('@/widgets/content-area-header/ui/ContentAreaHeader', () => ({
  default: ({ action }: { action: ReactNode }) => <header>{action}</header>,
}));
vi.mock('@/widgets/pagination', () => ({ PaginationWidget: () => null }));
vi.mock('@/features/notifications', () => ({
  NotificationListItem: () => <div data-testid="notification-item" />,
  useUnreadNotificationCount: () => ({ unreadCount: mocks.unreadCount }),
}));
vi.mock('@/pages/inbox/api/useNotifications', () => ({
  useNotifications: () => ({
    notifications: mocks.notifications,
    total: mocks.notifications.length,
    isLoading: false,
  }),
}));
vi.mock('@/pages/inbox/api/useMarkAllNotificationsRead', () => ({
  useMarkAllNotificationsRead: () => ({ mutate: vi.fn(), isPending: false }),
}));

afterEach(cleanup);

function markAllRead(): HTMLButtonElement {
  return screen.getByTestId('inbox-mark-all-read');
}

describe('InboxPage', () => {
  it('offers to mark all read while a listed notification is unread, even before the badge count refreshed', () => {
    mocks.notifications = [{ id: 'n1', readAt: null }];
    mocks.unreadCount = 0;

    render(<InboxPage page={1} />);

    expect(markAllRead().disabled).toBe(false);
  });

  it('does not offer it when everything is read', () => {
    mocks.notifications = [{ id: 'n1', readAt: '2026-11-07T08:00:00.000Z' }];
    mocks.unreadCount = 0;

    render(<InboxPage page={1} />);

    expect(markAllRead().disabled).toBe(true);
  });
});
