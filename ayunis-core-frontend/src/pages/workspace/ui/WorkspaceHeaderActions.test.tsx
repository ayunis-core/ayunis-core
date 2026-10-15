import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Workspace, WorkspaceAccessLevel } from '@/features/workspaces';
import { WorkspaceHeaderActions } from './WorkspaceHeaderActions';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/features/favorites', () => ({
  isFavorite: () => false,
  useFavorites: () => ({ favorites: [] }),
  useToggleFavorite: () => ({ toggle: vi.fn() }),
}));
vi.mock('@/widgets/workspace-members-dialog', () => ({
  WorkspaceMembersButton: () => null,
}));
vi.mock('@/shared/ui/help-link/HelpLink', () => ({
  HelpLink: () => null,
}));

afterEach(cleanup);

function aWorkspace(accessLevel: WorkspaceAccessLevel): Workspace {
  return {
    id: 'workspace-id',
    name: 'Haushalt 2027',
    description: null,
    instruction: null,
    icon: 'folder',
    color: 'violet',
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
    accessLevel,
    memberCount: 3,
  };
}

function renderActions(accessLevel: WorkspaceAccessLevel) {
  render(
    <WorkspaceHeaderActions
      workspace={aWorkspace(accessLevel)}
      onOpenSettings={vi.fn()}
      onOpenTransfer={vi.fn()}
      onOpenDelete={vi.fn()}
    />,
  );
}

function openMenu() {
  fireEvent.pointerDown(screen.getByTestId('workspace-actions-menu'), {
    button: 0,
    ctrlKey: false,
  });
}

describe('WorkspaceHeaderActions', () => {
  it('offers editing, handing over and deleting to the owner', () => {
    renderActions('owner');
    openMenu();

    expect(screen.getByText('actions.edit')).toBeTruthy();
    expect(screen.getByTestId('workspace-transfer-action')).toBeTruthy();
    expect(screen.getByTestId('workspace-delete-action')).toBeTruthy();
  });

  it('offers only editing to members with full access', () => {
    renderActions('full');
    openMenu();

    expect(screen.getByText('actions.edit')).toBeTruthy();
    expect(screen.queryByTestId('workspace-transfer-action')).toBeNull();
    expect(screen.queryByTestId('workspace-delete-action')).toBeNull();
  });

  it.each<WorkspaceAccessLevel>(['edit', 'use'])(
    'shows no menu to members who may %s',
    (accessLevel) => {
      renderActions(accessLevel);

      expect(screen.queryByTestId('workspace-actions-menu')).toBeNull();
    },
  );
});
