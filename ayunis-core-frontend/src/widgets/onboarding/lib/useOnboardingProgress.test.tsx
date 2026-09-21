import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useOnboardingProgress } from './useOnboardingProgress';

const mocks = vi.hoisted(() => ({
  workspacesEnabled: true,
}));

vi.mock('@/features/feature-toggles', () => ({
  useFeatureToggles: () => ({
    knowledgeBasesEnabled: true,
    letterheadsEnabled: false,
    skillsEnabled: true,
    workspacesEnabled: mocks.workspacesEnabled,
    ssoLoginEnabled: false,
  }),
}));

function renderProgress(completedStepIds: string[] = []) {
  return renderHook(() => useOnboardingProgress(false, completedStepIds)).result
    .current;
}

describe('useOnboardingProgress workspaces gating', () => {
  beforeEach(() => {
    mocks.workspacesEnabled = true;
  });

  it('shows the workspaces category when the feature is enabled', () => {
    const { visibleCategories } = renderProgress();

    expect(visibleCategories.map((category) => category.id)).toContain(
      'workspaces',
    );
  });

  it('hides the workspaces category when the feature is disabled', () => {
    mocks.workspacesEnabled = false;

    const { visibleCategories } = renderProgress();

    expect(visibleCategories.map((category) => category.id)).not.toContain(
      'workspaces',
    );
  });

  it('leaves workspace steps out of the totals when the feature is disabled', () => {
    const enabledTotal = renderProgress().totalSteps;

    mocks.workspacesEnabled = false;
    const disabledTotal = renderProgress().totalSteps;

    expect(disabledTotal).toBeLessThan(enabledTotal);
    expect(enabledTotal - disabledTotal).toBe(8);
  });

  it('ignores completed workspace steps in the progress while the feature is disabled', () => {
    mocks.workspacesEnabled = false;

    const { completedCount } = renderProgress([
      'createWorkspace',
      'favoriteWorkspace',
    ]);

    expect(completedCount).toBe(0);
  });
});
