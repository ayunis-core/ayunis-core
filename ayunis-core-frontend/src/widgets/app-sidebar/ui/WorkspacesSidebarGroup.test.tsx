import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SidebarProvider } from '@ayunis/ui/components/sidebar';
import { WorkspacesSidebarGroup } from './WorkspacesSidebarGroup';

const mocks = vi.hoisted(() => ({
  favorites: [] as Array<{ referenceType: string; referenceId: string }>,
  areFavoritesLoading: false,
  workspaces: [
    {
      id: 'workspace-a',
      name: 'Bürgeranfragen',
      icon: 'folder',
      color: 'violet',
    },
  ] as Array<Record<string, unknown>>,
  useWorkspaceThreads: vi.fn(),
}));

vi.mock('@/features/workspaces', () => ({
  useWorkspaces: () => ({ workspaces: mocks.workspaces }),
}));

vi.mock('@/widgets/app-sidebar/api', () => ({
  useWorkspaceThreads: mocks.useWorkspaceThreads,
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
  useParams: () => ({}),
  useNavigate: () => vi.fn(),
}));

vi.mock('@/widgets/workspace-settings-dialog', () => ({
  WorkspaceSettingsDialog: () => null,
  WorkspaceDeleteDialog: () => null,
}));

vi.mock('@/features/favorites', () => ({
  useFavorites: () => ({
    favorites: mocks.favorites,
    isLoading: mocks.areFavoritesLoading,
  }),
  useToggleFavorite: () => ({ toggle: vi.fn() }),
  isFavorite: () => false,
}));

vi.mock('@/shared/hooks/useDropdownDialogTransition', () => ({
  useDropdownDialogTransition: () => ({
    requestDialogOpen: (open: () => void) => open(),
    handleCloseAutoFocus: vi.fn(),
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

function renderGroup() {
  render(
    <SidebarProvider>
      <WorkspacesSidebarGroup />
    </SidebarProvider>,
  );
}

describe('WorkspacesSidebarGroup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.favorites = [];
    mocks.areFavoritesLoading = false;
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    mocks.workspaces = [
      {
        id: 'workspace-a',
        name: 'Bürgeranfragen',
        icon: 'folder',
        color: 'violet',
      },
    ];
    mocks.useWorkspaceThreads.mockReturnValue({
      threads: [{ id: 'thread-a', title: 'Antrag prüfen' }],
      hasMore: false,
      isLoading: false,
      error: null,
    });
  });

  afterEach(cleanup);

  it('lists the workspaces and keeps their chats collapsed', () => {
    renderGroup();

    expect(screen.getByText('Bürgeranfragen')).toBeTruthy();
    expect(screen.queryByText('Antrag prüfen')).toBeNull();
    expect(mocks.useWorkspaceThreads).toHaveBeenCalledWith(
      'workspace-a',
      false,
    );
  });

  it('loads and shows the chats of an expanded workspace', () => {
    renderGroup();

    fireEvent.click(screen.getByTestId('sidebar-workspace-toggle-workspace-a'));

    expect(mocks.useWorkspaceThreads).toHaveBeenLastCalledWith(
      'workspace-a',
      true,
    );
    expect(screen.getByText('Antrag prüfen')).toBeTruthy();
  });

  it('offers editing, pinning and deleting from the row menu', () => {
    renderGroup();

    fireEvent.pointerDown(
      screen.getByTestId('sidebar-workspace-menu-workspace-a'),
      { button: 0, ctrlKey: false, pointerType: 'mouse' },
    );

    expect(screen.getByText('actions.edit')).toBeTruthy();
    expect(screen.getByText('sidebar.pinWorkspace')).toBeTruthy();
    expect(screen.getByText('actions.delete')).toBeTruthy();
  });

  it('leaves a pinned workspace to the favorites group', () => {
    mocks.favorites = [
      { referenceType: 'workspace', referenceId: 'workspace-a' },
    ];

    renderGroup();

    expect(screen.queryByTestId('sidebar-workspaces')).toBeNull();
  });

  it('waits for the favorites before deciding what is pinned', () => {
    mocks.areFavoritesLoading = true;

    renderGroup();

    expect(screen.queryByTestId('sidebar-workspaces')).toBeNull();
  });

  it('renders nothing without workspaces', () => {
    mocks.workspaces = [];

    renderGroup();

    expect(screen.queryByTestId('sidebar-workspaces')).toBeNull();
  });
});
