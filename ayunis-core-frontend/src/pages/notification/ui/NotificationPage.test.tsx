import type { ReactNode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NotificationResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import NotificationPage from './NotificationPage';

const mocks = vi.hoisted(() => ({ canManageRoutines: true }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@tanstack/react-router', () => ({
  // Keeps the props Button asChild merges in, like data-testid.
  Link: ({
    children,
    to: _to,
    params: _params,
    search: _search,
    ...props
  }: {
    children: ReactNode;
    to: string;
    params?: unknown;
    search?: unknown;
  }) => <a {...props}>{children}</a>,
}));
vi.mock('@/layouts/app-layout', () => ({
  default: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('@/layouts/content-area-layout/ui/ContentAreaLayout', () => ({
  default: ({ contentArea }: { contentArea: ReactNode }) => contentArea,
}));
vi.mock('@/widgets/content-area-header/ui/ContentAreaHeader', () => ({
  default: () => null,
}));
vi.mock('@/widgets/markdown', () => ({
  Markdown: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/features/notifications', () => ({
  NotificationTypeIcon: () => null,
  useMarkNotificationRead: () => ({ mutate: vi.fn() }),
}));
vi.mock('@/features/permissions', () => ({
  useMyPermissions: () => ({
    can: (permission: string) =>
      permission === 'manage_routines' && mocks.canManageRoutines,
  }),
}));
vi.mock('@/widgets/chat-starter', () => ({
  ChatStarter: (props: {
    sourceNotificationId?: string;
    workspaceId?: string;
    selectedModelId?: string;
  }) => <output data-testid="chat-starter">{JSON.stringify(props)}</output>,
}));
vi.mock('@/pages/notification/api/useNotification', () => ({
  useNotification: () => ({ notification: undefined }),
}));

afterEach(cleanup);

function notification(
  overrides: Partial<NotificationResponseDto> = {},
): NotificationResponseDto {
  return {
    id: '6f0e4a52-8c1b-4f7e-9a51-3d2c1b0a9e8f',
    type: 'routine',
    headline: 'Neue Verordnung zur Grundsteuer',
    subheadline: 'GVBl. NRW vom 07.11.2026',
    body: 'Die Hebesätze ändern sich ab 2027.',
    routineId: '0b7d9c3e-2f4a-4c8e-b1d6-5a9e8f7c6b5a',
    routineThreadId: null,
    readAt: '2026-11-07T08:00:00.000Z',
    createdAt: '2026-11-07T06:35:00.000Z',
    ...overrides,
  };
}

function renderPage(overrides: Partial<NotificationResponseDto> = {}) {
  return render(
    <NotificationPage
      notification={notification(overrides)}
      selectedModelId="medium"
      isEmbeddingModelEnabled={false}
    />,
  );
}

describe('NotificationPage', () => {
  it('starts a chat about the notification outside any workspace', () => {
    renderPage();
    expect(
      JSON.parse(screen.getByTestId('chat-starter').textContent ?? ''),
    ).toMatchObject({
      sourceNotificationId: '6f0e4a52-8c1b-4f7e-9a51-3d2c1b0a9e8f',
      selectedModelId: 'medium',
      isEmbeddingModelEnabled: false,
    });
  });

  it('offers to open the routine that sent it', () => {
    mocks.canManageRoutines = true;
    renderPage();
    expect(screen.getByTestId('notification-open-routine')).toBeTruthy();
  });

  it('hides Open routine once the routine is deleted', () => {
    mocks.canManageRoutines = true;
    renderPage({ routineId: null });
    expect(screen.queryByTestId('notification-open-routine')).toBeNull();
  });

  it('hides Open routine without the manage routines permission', () => {
    mocks.canManageRoutines = false;
    renderPage();
    expect(screen.queryByTestId('notification-open-routine')).toBeNull();
  });
});
