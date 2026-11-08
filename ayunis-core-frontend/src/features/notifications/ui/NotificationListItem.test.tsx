import type { ReactNode } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NotificationListItem } from './NotificationListItem';
import type { Notification } from '@/features/notifications/model/openapi';

const mocks = vi.hoisted(() => ({ markRead: vi.fn() }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    className,
  }: {
    children: ReactNode;
    className?: string;
  }) => (
    <a href="/inbox/n1" className={className}>
      {children}
    </a>
  ),
}));
vi.mock('@/features/notifications/api/useMarkNotificationRead', () => ({
  useMarkNotificationRead: () => ({ mutate: mocks.markRead, isPending: false }),
}));

afterEach(() => {
  cleanup();
  mocks.markRead.mockReset();
});

function aNotification(
  readAt: string | null,
  overrides: Partial<Notification> = {},
): Notification {
  return {
    id: 'n1',
    type: 'routine',
    headline: 'Neue Verordnung',
    subheadline: 'GV. NRW. Nr. 31',
    body: 'Text',
    media: null,
    routineId: null,
    routineThreadId: null,
    readAt,
    createdAt: '2026-11-07T08:00:00.000Z',
    ...overrides,
  };
}

describe('NotificationListItem', () => {
  it('marks an unread notification read without opening it', () => {
    render(<NotificationListItem notification={aNotification(null)} />);

    const button = screen.getByTestId('notification-mark-read');
    expect(button.closest('a')).toBeNull();
    fireEvent.click(button);

    expect(mocks.markRead).toHaveBeenCalledWith('n1');
  });

  it('offers no mark-as-read action once the notification is read', () => {
    render(
      <NotificationListItem
        notification={aNotification('2026-11-07T09:00:00.000Z')}
      />,
    );

    expect(screen.queryByTestId('notification-mark-read')).toBeNull();
  });

  it('shows the subheadline under the headline', () => {
    render(<NotificationListItem notification={aNotification(null)} />);

    expect(
      screen.getByTestId('notification-item-subheadline').textContent,
    ).toBe('GV. NRW. Nr. 31');
  });

  it('leaves no empty line for a notification without a subheadline', () => {
    render(
      <NotificationListItem
        notification={aNotification(null, {
          type: 'release_note',
          subheadline: null,
        })}
      />,
    );

    expect(screen.queryByTestId('notification-item-subheadline')).toBeNull();
  });
});
