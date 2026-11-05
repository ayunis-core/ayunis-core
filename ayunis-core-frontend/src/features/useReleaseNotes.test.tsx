import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useReleaseNotes } from './useReleaseNotes';

const { onboardingState } = vi.hoisted(() => ({
  onboardingState: {
    data: { welcomeVideoSeenAt: null as string | null },
    isLoading: false,
    isError: false,
  },
}));

vi.mock('@/shared/config', () => ({
  default: { features: { announcableOrgId: 'org-id' } },
}));

vi.mock('@/shared/api/generated/ayunisCoreAPI', () => ({
  useOnboardingControllerGetOnboarding: () => onboardingState,
}));

vi.mock('@/features/patchAnnouncableMobileLayout', () => ({
  patchAnnouncableMobileLayout: () => ({ disconnect: vi.fn() }),
}));

describe('useReleaseNotes', () => {
  beforeEach(() => {
    document.getElementById('announcable-widget-script')?.remove();
    delete window.announcable_init;
    onboardingState.data.welcomeVideoSeenAt = null;
    onboardingState.isLoading = false;
    onboardingState.isError = false;
  });

  it('waits for the welcome video before loading release notes', () => {
    const { rerender } = renderHook(() => useReleaseNotes());

    expect(document.getElementById('announcable-widget-script')).toBeNull();

    onboardingState.isError = true;
    rerender();

    expect(document.getElementById('announcable-widget-script')).toBeNull();

    onboardingState.isError = false;
    onboardingState.data.welcomeVideoSeenAt = '2026-11-05T12:00:00.000Z';
    rerender();

    expect(document.getElementById('announcable-widget-script')).not.toBeNull();
  });
});
