import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SidebarMenu, SidebarProvider } from '@ayunis/ui/components/sidebar';
import type { Favorite } from '@/features/favorites';
import { FavoriteSidebarItem } from './FavoriteSidebarItem';

const mocks = vi.hoisted(() => ({
  useWorkspaceThreads: vi.fn(),
}));

vi.mock('@/widgets/app-sidebar/api', () => ({
  useWorkspaceThreads: mocks.useWorkspaceThreads,
}));

vi.mock('@/widgets/app-sidebar/api/useAssignThreadToWorkspace', () => ({
  useAssignThreadToWorkspace: () => ({ mutate: vi.fn() }),
}));

vi.mock('@/features/favorites', () => ({
  useToggleFavorite: () => ({ toggle: vi.fn() }),
}));

vi.mock('@/features/workspaces', () => ({
  useWorkspaces: () => ({ workspaces: [] }),
}));

vi.mock('@/widgets/create-workspace-dialog', () => ({
  CreateWorkspaceDialog: () => null,
}));

vi.mock('@/widgets/workspace-picker-menu', () => ({
  WorkspacePickerMenuWithCreate: () => null,
}));

vi.mock('@/shared/hooks/useDropdownDialogTransition', () => ({
  useDropdownDialogTransition: () => ({
    requestDialogOpen: (open: () => void) => open(),
    handleCloseAutoFocus: vi.fn(),
  }),
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
  useParams: () => ({}),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

function aFavorite(overrides: Partial<Favorite> = {}): Favorite {
  return {
    id: 'favorite-id',
    position: 0,
    referenceType: 'workspace',
    referenceId: 'workspace-a',
    name: 'Bürgeranfragen',
    icon: 'folder',
    color: 'violet',
    ...overrides,
  } as Favorite;
}

function renderItem(favorite: Favorite) {
  render(
    <SidebarProvider>
      <SidebarMenu>
        <FavoriteSidebarItem
          item={favorite}
          workspace={undefined}
          canMoveUp={false}
          canMoveDown={false}
          onMove={vi.fn()}
          onRename={vi.fn()}
          onDelete={vi.fn()}
          onOpenWorkspaceSettings={vi.fn()}
        />
      </SidebarMenu>
    </SidebarProvider>,
  );
}

describe('FavoriteSidebarItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    mocks.useWorkspaceThreads.mockReturnValue({
      threads: [{ id: 'thread-a', title: 'Antrag prüfen' }],
      hasMore: false,
      isLoading: false,
      error: null,
    });
  });

  afterEach(cleanup);

  it('expands a favorited workspace into its chats', () => {
    renderItem(aFavorite());

    expect(screen.queryByText('Antrag prüfen')).toBeNull();

    fireEvent.click(screen.getByTestId('sidebar-workspace-toggle-workspace-a'));

    expect(mocks.useWorkspaceThreads).toHaveBeenLastCalledWith(
      'workspace-a',
      true,
    );
    expect(screen.getByText('Antrag prüfen')).toBeTruthy();
  });

  it('leaves a favorited chat without a chat list', () => {
    renderItem(
      aFavorite({
        referenceType: 'thread',
        referenceId: 'thread-b',
        name: 'Einladung',
      }),
    );

    expect(
      screen.queryByTestId('sidebar-workspace-toggle-thread-b'),
    ).toBeNull();
    expect(mocks.useWorkspaceThreads).not.toHaveBeenCalled();
  });
});
