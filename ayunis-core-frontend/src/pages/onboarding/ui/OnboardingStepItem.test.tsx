import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as OnboardingWidget from '@/widgets/onboarding';
import { ONBOARDING_CATEGORIES } from '@/widgets/onboarding/config/categories';
import OnboardingStepItem from './OnboardingStepItem';

type OnboardingWidgetModule = typeof OnboardingWidget;

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(() => Promise.resolve()),
  launchTour: vi.fn(),
  armReturn: vi.fn(),
  workspaces: [] as { id: string; name: string }[],
  areWorkspacesLoading: false,
  workspacesError: null as Error | null,
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

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock('@/features/workspaces', () => ({
  useWorkspaces: () => ({
    workspaces: mocks.workspaces,
    isLoading: mocks.areWorkspacesLoading,
    error: mocks.workspacesError,
  }),
  findUnfavoritedWorkspace: (
    workspaces: { id: string }[],
    favorites: string[],
  ) => workspaces.find((workspace) => !favorites.includes(workspace.id)),
}));

vi.mock('@/widgets/onboarding', async (importOriginal) => {
  const actual = await importOriginal<OnboardingWidgetModule>();
  return {
    ...actual,
    useOnboardingTour: () => ({
      launchTour: mocks.launchTour,
      armReturn: mocks.armReturn,
      isTourActive: false,
      isReturnActive: false,
    }),
  };
});

vi.mock('@/shared/api/generated/ayunisCoreAPI', () => ({
  useKnowledgeBasesControllerFindAll: () => ({ data: undefined }),
  useSkillsControllerFindAll: () => ({ data: undefined }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/shared/lib/help-center', () => ({
  getHelpCenterUrl: (path: string) => `https://help.example/${path}`,
}));

const workspaceCategory = ONBOARDING_CATEGORIES.find(
  (category) => category.id === 'workspaces',
);

function stepById(id: string) {
  const step = workspaceCategory?.steps.find((entry) => entry.id === id);
  if (!step) throw new Error(`missing step ${id}`);
  return step;
}

async function clickAction(stepId: string) {
  render(
    <OnboardingStepItem
      step={stepById(stepId)}
      completed={false}
      locked={false}
      defaultExpanded
      onComplete={vi.fn()}
    />,
  );
  await act(async () => {
    fireEvent.click(
      screen.getByRole('button', { name: `steps.${stepId}.action` }),
    );
  });
}

describe('OnboardingStepItem workspace steps', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.workspaces = [{ id: 'workspace-1', name: 'Bürgeranfragen' }];
    mocks.areWorkspacesLoading = false;
    mocks.workspacesError = null;
    mocks.favoriteWorkspaceIds = [];
    mocks.areFavoritesLoading = false;
  });

  afterEach(() => {
    document
      .querySelectorAll('[data-tour]')
      .forEach((element) => element.remove());
  });

  it('deep-links a workspace context step to its tab', async () => {
    await clickAction('workspaceKnowledge');

    expect(mocks.navigate).toHaveBeenCalledWith({
      to: '/workspaces/$workspaceId',
      params: { workspaceId: 'workspace-1' },
      search: { tab: 'knowledge' },
    });
    expect(mocks.launchTour).toHaveBeenCalledWith(
      expect.objectContaining({ target: 'workspace-knowledge' }),
    );
  });

  it('opens the workspace page without a tab for the chat starter step', async () => {
    await clickAction('startWorkspaceChat');

    expect(mocks.navigate).toHaveBeenCalledWith({
      to: '/workspaces/$workspaceId',
      params: { workspaceId: 'workspace-1' },
      search: { tab: undefined },
    });
    expect(mocks.launchTour).toHaveBeenCalledWith(
      expect.objectContaining({ target: 'chat-composer' }),
    );
  });

  it('sends the picker step to the workspace picker in a new chat', async () => {
    await clickAction('selectWorkspaceInChat');

    expect(mocks.navigate).toHaveBeenCalledWith({ to: '/chat' });
    expect(mocks.launchTour).toHaveBeenCalledWith(
      expect.objectContaining({ target: 'select-workspace-in-chat' }),
    );
  });

  it('keeps the favourite step on the overview', async () => {
    await clickAction('favoriteWorkspace');

    expect(mocks.navigate).toHaveBeenCalledWith({ to: '/workspaces' });
    expect(mocks.launchTour).toHaveBeenCalledWith(
      expect.objectContaining({ target: 'favorite-workspace' }),
    );
  });

  it('sends the assign step to the chat page for the sidebar spotlight', async () => {
    const row = document.createElement('div');
    row.setAttribute('data-tour', 'assign-chat-to-workspace');
    document.body.appendChild(row);

    await clickAction('assignChatToWorkspace');

    expect(mocks.navigate).toHaveBeenCalledWith({ to: '/chat' });
    expect(mocks.launchTour).toHaveBeenCalledWith(
      expect.objectContaining({ target: 'assign-chat-to-workspace' }),
    );
  });

  it('skips the assign spotlight when the sidebar holds no chat row', async () => {
    await clickAction('assignChatToWorkspace');

    expect(mocks.navigate).toHaveBeenCalledWith({ to: '/chat' });
    expect(mocks.launchTour).not.toHaveBeenCalled();
  });

  it('does not claim a missing workspace while the list is still loading', async () => {
    mocks.workspaces = [];
    mocks.areWorkspacesLoading = true;

    await clickAction('workspaceSkill');

    expect(mocks.navigate).toHaveBeenCalledWith({ to: '/workspaces' });
    expect(mocks.launchTour).not.toHaveBeenCalled();
  });

  it('does not claim a missing workspace when the list failed to load', async () => {
    mocks.workspaces = [];
    mocks.workspacesError = new Error('offline');

    await clickAction('workspaceSkill');

    expect(mocks.navigate).toHaveBeenCalledWith({ to: '/workspaces' });
    expect(mocks.launchTour).not.toHaveBeenCalled();
  });

  it('skips the favourite spotlight while the favourites are still loading', async () => {
    mocks.areFavoritesLoading = true;

    await clickAction('favoriteWorkspace');

    expect(mocks.navigate).toHaveBeenCalledWith({ to: '/workspaces' });
    expect(mocks.launchTour).not.toHaveBeenCalled();
  });

  it('skips the favourite spotlight when every workspace is already a favourite', async () => {
    mocks.favoriteWorkspaceIds = ['workspace-1'];

    await clickAction('favoriteWorkspace');

    expect(mocks.navigate).toHaveBeenCalledWith({ to: '/workspaces' });
    expect(mocks.launchTour).not.toHaveBeenCalled();
  });

  it('falls back to the create-workspace spotlight when none exists yet', async () => {
    mocks.workspaces = [];

    await clickAction('workspaceSkill');

    expect(mocks.navigate).toHaveBeenCalledWith({ to: '/workspaces' });
    expect(mocks.launchTour).toHaveBeenCalledWith(
      expect.objectContaining({
        target: 'create-workspace',
        title: 'steps.createWorkspace.spotlightTitle',
      }),
    );
  });
});
