import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CreateSkillMenu from './CreateSkillMenu';

const mocks = vi.hoisted(() => {
  const marketplace: { enabled: boolean; url: string | null } = {
    enabled: true,
    url: 'https://marketplace.ayunis.com/',
  };
  return { navigate: vi.fn(), marketplace, can: vi.fn(() => true) };
});

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock('@/features/marketplace', () => ({
  useMarketplaceConfig: () => mocks.marketplace,
}));

vi.mock('@/features/permissions', () => ({
  useMyPermissions: () => ({ can: mocks.can, isLoading: false }),
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
    mocks.marketplace = {
      enabled: true,
      url: 'https://marketplace.ayunis.com/',
    };
    mocks.can = vi.fn(() => true);
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

  it('hides the marketplace entry when no marketplace is configured', () => {
    mocks.marketplace = { enabled: false, url: null };

    openMenu();

    expect(screen.queryByTestId('create-skill-marketplace')).toBeNull();
    expect(screen.getByTestId('create-skill-guided')).toBeTruthy();
  });

  it('renders nothing without the permission to manage skills', () => {
    mocks.can = vi.fn(() => false);

    render(<CreateSkillMenu />);

    expect(screen.queryByTestId('create-skill-menu')).toBeNull();
  });
});
