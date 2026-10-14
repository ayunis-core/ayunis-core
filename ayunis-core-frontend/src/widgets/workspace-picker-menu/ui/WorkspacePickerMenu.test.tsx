import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@ayunis/ui/components/dropdown-menu';
import type { Favorite } from '@/features/favorites';
import type { Workspace } from '@/features/workspaces';
import { WorkspacePickerMenu } from './WorkspacePickerMenu';

const favoritesMock = vi.hoisted(() => ({ favorites: [] as Favorite[] }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/features/favorites', () => ({
  useFavorites: () => favoritesMock,
}));
afterEach(() => {
  cleanup();
  favoritesMock.favorites = [];
});

function workspace(id: string): Workspace {
  return {
    id,
    name: `Workspace ${id}`,
    icon: 'folder',
    color: '',
  } as Workspace;
}

function favorite(referenceId: string, position: number): Favorite {
  return {
    id: `fav-${referenceId}`,
    referenceId,
    referenceType: 'workspace',
    position,
  } as Favorite;
}

function renderMenu(selectedWorkspaceId: string | null = null) {
  render(
    <DropdownMenu open>
      <DropdownMenuTrigger>Workspaces</DropdownMenuTrigger>
      <DropdownMenuContent>
        <WorkspacePickerMenu
          workspaces={[workspace('a'), workspace('b'), workspace('c')]}
          selectedWorkspaceId={selectedWorkspaceId}
          onSelect={vi.fn()}
        />
      </DropdownMenuContent>
    </DropdownMenu>,
  );
}

function menuEntries(): string[] {
  return Array.from(
    document.querySelectorAll(
      '[data-slot="dropdown-menu-label"], [role="menuitem"]',
    ),
  ).map((element) => element.textContent ?? '');
}

describe('WorkspacePickerMenu', () => {
  it('lists the workspaces without group labels when nothing is a favorite', () => {
    renderMenu();

    expect(menuEntries()).toEqual([
      'Workspace a',
      'Workspace b',
      'Workspace c',
    ]);
  });

  it('shows favorites first in sidebar order, then the other workspaces', () => {
    favoritesMock.favorites = [favorite('c', 0), favorite('a', 1)];

    renderMenu();

    expect(menuEntries()).toEqual([
      'picker.favorites',
      'Workspace c',
      'Workspace a',
      'picker.otherWorkspaces',
      'Workspace b',
    ]);
  });

  it('omits the other-workspaces label when every workspace is a favorite', () => {
    favoritesMock.favorites = [
      favorite('a', 0),
      favorite('b', 1),
      favorite('c', 2),
    ];

    renderMenu();

    expect(menuEntries()).toEqual([
      'picker.favorites',
      'Workspace a',
      'Workspace b',
      'Workspace c',
    ]);
  });

  it('marks the selected workspace inside the favorites group', () => {
    favoritesMock.favorites = [favorite('b', 0)];

    renderMenu('b');

    const selected = screen.getByRole('menuitem', { name: 'Workspace b' });
    expect(selected.querySelector('.lucide-check')).not.toBeNull();
    expect(
      screen
        .getByRole('menuitem', { name: 'Workspace a' })
        .querySelector('.lucide-check'),
    ).toBeNull();
  });
});
