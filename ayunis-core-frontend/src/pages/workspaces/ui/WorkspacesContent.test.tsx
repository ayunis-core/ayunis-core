import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Workspace } from '@/features/workspaces';
import { WorkspacesContent } from './WorkspacesContent';

const mocks = vi.hoisted(() => ({
  favoriteWorkspaceIds: [] as string[],
  areFavoritesLoading: false,
}));

vi.mock('@/features/favorites', () => ({
  useFavorites: () => ({
    favorites: mocks.favoriteWorkspaceIds,
    isLoading: mocks.areFavoritesLoading,
  }),
  isFavorite: (favorites: string[], referenceId: string) =>
    favorites.includes(referenceId),
}));

vi.mock('./WorkspaceRow', () => ({
  WorkspaceRow: ({
    workspace,
    pinTourTarget,
  }: {
    workspace: Workspace;
    pinTourTarget?: boolean;
  }) => (
    <div
      data-testid={`row-${workspace.id}`}
      data-tour-target={pinTourTarget ? 'yes' : 'no'}
    />
  ),
}));

const workspaces = [
  { id: 'a', name: 'Bürgeranfragen' },
  { id: 'b', name: 'Haushalt' },
] as Workspace[];

function targetOf(id: string) {
  return screen.getByTestId(`row-${id}`).getAttribute('data-tour-target');
}

describe('WorkspacesContent favourite tour target', () => {
  beforeEach(() => {
    mocks.favoriteWorkspaceIds = [];
    mocks.areFavoritesLoading = false;
  });

  it('marks the first row when nothing is favourited yet', () => {
    render(<WorkspacesContent workspaces={workspaces} />);

    expect(targetOf('a')).toBe('yes');
    expect(targetOf('b')).toBe('no');
  });

  it('skips a workspace that is already favourited', () => {
    mocks.favoriteWorkspaceIds = ['a'];

    render(<WorkspacesContent workspaces={workspaces} />);

    expect(targetOf('a')).toBe('no');
    expect(targetOf('b')).toBe('yes');
  });

  it('marks no row while the favourites are still loading', () => {
    mocks.areFavoritesLoading = true;

    render(<WorkspacesContent workspaces={workspaces} />);

    expect(targetOf('a')).toBe('no');
    expect(targetOf('b')).toBe('no');
  });

  it('marks no row when every workspace is already favourited', () => {
    mocks.favoriteWorkspaceIds = ['a', 'b'];

    render(<WorkspacesContent workspaces={workspaces} />);

    expect(targetOf('a')).toBe('no');
    expect(targetOf('b')).toBe('no');
  });
});
