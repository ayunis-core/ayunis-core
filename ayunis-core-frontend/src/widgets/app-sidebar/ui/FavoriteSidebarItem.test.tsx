import type { MouseEventHandler, PropsWithChildren, ReactNode } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Favorite } from '@/features/favorites';
import { FavoriteSidebarItem } from './FavoriteSidebarItem';

const { client } = vi.hoisted(() => ({ client: { track: vi.fn() } }));

vi.mock('@/shared/lib/openpanel', () => ({ openPanel: client }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@tanstack/react-router', () => ({
  useParams: () => ({}),
  Link: ({
    children,
    onClick,
  }: {
    children: ReactNode;
    onClick?: MouseEventHandler<HTMLAnchorElement>;
  }) => (
    <a href="#favorite" onClick={onClick}>
      {children}
    </a>
  ),
}));
vi.mock('@ayunis/ui/components/sidebar', () => {
  const Passthrough = ({ children }: PropsWithChildren) => <>{children}</>;
  return {
    SidebarMenuAction: Passthrough,
    SidebarMenuButton: Passthrough,
    SidebarMenuItem: Passthrough,
  };
});
vi.mock('@/features/favorites', () => ({
  useToggleFavorite: () => ({ toggle: vi.fn() }),
}));
vi.mock('@/features/workspaces', () => ({
  useWorkspaces: () => ({ workspaces: [] }),
}));
vi.mock('@/widgets/app-sidebar/api/useAssignThreadToWorkspace', () => ({
  useAssignThreadToWorkspace: () => ({ mutate: vi.fn() }),
}));

function renderFavorite(item: Favorite) {
  render(
    <FavoriteSidebarItem
      item={item}
      workspace={undefined}
      canMoveUp={false}
      canMoveDown={false}
      onMove={vi.fn()}
      onRename={vi.fn()}
      onDelete={vi.fn()}
      onOpenWorkspaceSettings={vi.fn()}
    />,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  client.track.mockResolvedValue(undefined);
});
afterEach(cleanup);

describe('favorite_opened', () => {
  it('is sent with the resource type when a chat is opened from the favorites list', () => {
    renderFavorite({
      id: 'favorite-1',
      referenceType: 'thread',
      referenceId: 'thread-1',
      name: 'Haushalt 2027',
    } as Favorite);

    fireEvent.click(screen.getByRole('link'));

    expect(client.track.mock.calls).toEqual([
      ['favorite_opened', { resource_type: 'thread' }],
    ]);
  });
});
