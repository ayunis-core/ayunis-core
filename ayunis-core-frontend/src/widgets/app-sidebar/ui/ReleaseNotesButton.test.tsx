import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { ReleaseNotesButton } from './ReleaseNotesButton';

interface BellState {
  toggles?: { routinesEnabled: boolean; releaseNotesEnabled?: boolean };
  unreadCount: number;
  announcableOrgId?: string;
}

const { state, useReleaseNotes } = vi.hoisted(() => {
  const state: BellState = { unreadCount: 0 };
  return { state, useReleaseNotes: vi.fn() };
});

vi.mock('@/shared/config', () => ({
  default: {
    features: {
      get announcableOrgId() {
        return state.announcableOrgId;
      },
    },
  },
}));

vi.mock('@/features/feature-toggles', () => ({
  useFeatureToggles: () => ({ toggles: state.toggles }),
}));

vi.mock('@/features/useReleaseNotes', () => ({ useReleaseNotes }));

vi.mock('@/features/release-notes', () => ({
  useUnreadReleaseNoteCount: () => ({ unreadCount: state.unreadCount }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...props }: { children: ReactNode; to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useLocation: () => ({ pathname: '/chat' }),
}));

vi.mock('@ayunis/ui/components/sidebar', () => ({
  SidebarMenuButton: ({ children }: { children: ReactNode }) => children,
}));

function renderBell() {
  const { container } = render(<ReleaseNotesButton />);
  return container.querySelector('#updates-button');
}

describe('ReleaseNotesButton', () => {
  afterEach(cleanup);

  beforeEach(() => {
    state.toggles = undefined;
    state.announcableOrgId = 'org-id';
    state.unreadCount = 0;
    useReleaseNotes.mockClear();
  });

  it('shows the Announcable bell while routines are off', () => {
    state.toggles = { routinesEnabled: false };

    expect(renderBell()).not.toBeNull();
    expect(useReleaseNotes).toHaveBeenCalled();
  });

  it('shows no bell and loads no widget with routines on but release notes off', () => {
    state.toggles = { routinesEnabled: true, releaseNotesEnabled: false };

    expect(renderBell()).toBeNull();
    expect(screen.queryByTestId('sidebar-product-updates')).toBeNull();
    expect(useReleaseNotes).not.toHaveBeenCalled();
  });

  it('links to the product updates page with release notes on, without the widget', () => {
    state.toggles = { routinesEnabled: true, releaseNotesEnabled: true };

    expect(renderBell()).toBeNull();
    expect(
      screen.getByTestId('sidebar-product-updates').getAttribute('href'),
    ).toBe('/news');
    expect(screen.queryByTestId('sidebar-product-updates-unread')).toBeNull();
    expect(useReleaseNotes).not.toHaveBeenCalled();
  });

  it('shows a dot while a product update is unread', () => {
    state.toggles = { routinesEnabled: true, releaseNotesEnabled: true };
    state.unreadCount = 2;

    renderBell();

    expect(screen.getByTestId('sidebar-product-updates-unread')).toBeTruthy();
  });

  it('loads no widget before the feature toggles are known', () => {
    expect(renderBell()).toBeNull();
    expect(useReleaseNotes).not.toHaveBeenCalled();
  });

  it('hides the bell without an Announcable org ID', () => {
    state.toggles = { routinesEnabled: false };
    state.announcableOrgId = undefined;

    expect(renderBell()).toBeNull();
    expect(useReleaseNotes).not.toHaveBeenCalled();
  });
});
