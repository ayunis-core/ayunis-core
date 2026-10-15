import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CreateSkillMenu from './CreateSkillMenu';

const MARKETPLACE_URL = 'https://marketplace.ayunis.com/';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  marketplaceUrl: null as string | null,
  can: vi.fn(() => true),
  ownerOptions: [{ type: 'personal' }] as { type: string; teamId?: string }[],
  ownersLoading: false,
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock('@/features/marketplace', () => ({
  useSkillMarketplaceUrl: () => mocks.marketplaceUrl,
}));

vi.mock('@/features/permissions', () => ({
  useMyPermissions: () => ({ can: mocks.can, isLoading: false }),
}));

vi.mock('@/features/resource-ownership', () => ({
  useOwnerOptions: () => ({
    options: mocks.ownerOptions,
    isLoading: mocks.ownersLoading,
  }),
}));

vi.mock('@/shared/hooks/useDropdownDialogTransition', () => ({
  useDropdownDialogTransition: () => ({
    requestDialogOpen: (open: () => void) => open(),
    handleCloseAutoFocus: vi.fn(),
  }),
}));

vi.mock('./CreateSkillDialog', () => ({
  default: ({ open }: { open?: boolean }) =>
    open ? <div data-testid="skill-editor-dialog" /> : null,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

function openMenu() {
  render(<CreateSkillMenu />);
  fireEvent.pointerDown(screen.getByTestId('create-skill-menu'), {
    button: 0,
    ctrlKey: false,
    pointerType: 'mouse',
  });
}

describe('CreateSkillMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.marketplaceUrl = MARKETPLACE_URL;
    mocks.can = vi.fn(() => true);
    mocks.ownerOptions = [{ type: 'personal' }];
    mocks.ownersLoading = false;
  });

  afterEach(cleanup);

  it('sends the guided route into a new chat with a starting prompt', () => {
    openMenu();

    fireEvent.click(screen.getByTestId('create-skill-guided'));

    expect(mocks.navigate).toHaveBeenCalledWith({
      to: '/chat',
      search: { prompt: 'createMenu.guidedPrompt' },
    });
  });

  it('opens the editor dialog from the menu', () => {
    openMenu();

    fireEvent.click(screen.getByTestId('create-skill-editor'));

    expect(screen.getByTestId('skill-editor-dialog')).toBeTruthy();
  });

  it('opens the marketplace from the menu when it is available', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    openMenu();

    fireEvent.click(screen.getByTestId('create-skill-marketplace'));

    expect(open).toHaveBeenCalledWith(
      MARKETPLACE_URL,
      '_blank',
      'noopener,noreferrer',
    );
    open.mockRestore();
  });

  it('hides the marketplace entry when the marketplace is unavailable to the member', () => {
    mocks.marketplaceUrl = null;

    openMenu();

    expect(screen.queryByTestId('create-skill-marketplace')).toBeNull();
    expect(screen.getByTestId('create-skill-guided')).toBeTruthy();
  });

  it('renders nothing without any way to create a skill', () => {
    mocks.can = vi.fn(() => false);
    mocks.ownerOptions = [];
    mocks.marketplaceUrl = null;

    render(<CreateSkillMenu />);

    expect(screen.queryByTestId('create-skill-menu')).toBeNull();
  });

  it('offers only the editor to a team admin without the own-skills right', () => {
    mocks.can = vi.fn(() => false);
    mocks.ownerOptions = [{ type: 'team', teamId: 'team-1' }];
    mocks.marketplaceUrl = null;

    openMenu();

    expect(screen.getByTestId('create-skill-editor')).toBeTruthy();
    expect(screen.queryByTestId('create-skill-guided')).toBeNull();
  });

  it('keeps the guided route hidden without the own-skills right while owner options load', () => {
    mocks.can = vi.fn(() => false);
    mocks.ownerOptions = [];
    mocks.ownersLoading = true;
    mocks.marketplaceUrl = null;

    openMenu();

    expect(screen.queryByTestId('create-skill-guided')).toBeNull();
  });
});
