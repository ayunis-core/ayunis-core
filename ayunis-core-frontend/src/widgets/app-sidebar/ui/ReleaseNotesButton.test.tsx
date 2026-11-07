import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { ReleaseNotesButton } from './ReleaseNotesButton';

interface BellState {
  toggles?: { routinesEnabled: boolean };
  announcableOrgId?: string;
}

const { state, useReleaseNotes } = vi.hoisted(() => {
  const state: BellState = {};
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

vi.mock('@ayunis/ui/components/sidebar', () => ({
  SidebarMenuButton: ({ children }: { children: ReactNode }) => children,
}));

function renderBell() {
  const { container } = render(<ReleaseNotesButton />);
  return container.querySelector('#updates-button');
}

describe('ReleaseNotesButton', () => {
  beforeEach(() => {
    state.toggles = undefined;
    state.announcableOrgId = 'org-id';
    useReleaseNotes.mockClear();
  });

  it('shows the Announcable bell while routines are off', () => {
    state.toggles = { routinesEnabled: false };

    expect(renderBell()).not.toBeNull();
    expect(useReleaseNotes).toHaveBeenCalled();
  });

  it('hides the bell and loads no widget while routines are on', () => {
    state.toggles = { routinesEnabled: true };

    expect(renderBell()).toBeNull();
    expect(useReleaseNotes).not.toHaveBeenCalled();
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
