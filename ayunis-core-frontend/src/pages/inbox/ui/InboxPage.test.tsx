import type { ReactNode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import InboxPage from './InboxPage';

const mocks = vi.hoisted(() => ({
  notifications: [] as { id: string; readAt: string | null }[],
  unreadCount: 0,
  useNotifications: vi.fn(),
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
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, ...props }: { children: ReactNode }) => (
    <a {...props}>{children}</a>
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
vi.mock('@/widgets/pagination', () => ({ PaginationWidget: () => null }));
vi.mock('@/shared/lib/prototype-settings', () => ({
  useInboxVariant: () => ['list'],
}));
vi.mock('@/widgets/prototype-switcher', () => ({
  PrototypeSwitcher: () => null,
}));
vi.mock('./InboxSplitView', () => ({ InboxSplitView: () => null }));
vi.mock('@/features/notifications', () => ({
  NotificationListItem: () => <div data-testid="notification-item" />,
  NotificationTypeIcon: () => null,
  useUnreadNotificationCount: () => ({ unreadCount: mocks.unreadCount }),
}));
vi.mock('@/pages/inbox/api/useNotifications', () => ({
  useNotifications: (...args: unknown[]) => {
    mocks.useNotifications(...args);
    return {
      notifications: mocks.notifications,
      total: mocks.notifications.length,
      isLoading: false,
    };
  },
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

  it('lists all types without a filter', () => {
    mocks.notifications = [{ id: 'n1', readAt: null }];

    render(<InboxPage page={1} />);

    expect(mocks.useNotifications).toHaveBeenLastCalledWith(1, undefined);
    expect(screen.queryByTestId('inbox-type-filter')).toBeNull();
  });

  it('lists only the filtered type, names the filter and offers to clear it', () => {
    mocks.notifications = [{ id: 'n1', readAt: null }];

    render(<InboxPage page={2} type="routine_error" />);

    expect(mocks.useNotifications).toHaveBeenLastCalledWith(2, 'routine_error');
    expect(screen.getByTestId('inbox-type-filter').textContent).toContain(
      'filter.type.routine_error',
    );
    expect(screen.getByTestId('inbox-type-filter-clear')).toBeTruthy();
  });

  it('keeps the filter visible when the filtered type has no notifications', () => {
    mocks.notifications = [];

    render(<InboxPage page={1} type="routine" />);

    expect(screen.getByTestId('inbox-type-filter')).toBeTruthy();
    expect(screen.getByTestId('inbox-type-filter-clear')).toBeTruthy();
  });
});
