import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useOnboardingProgress } from './useOnboardingProgress';

function renderProgress(completedStepIds: string[] = []) {
  return renderHook(() => useOnboardingProgress(false, completedStepIds)).result
    .current;
}

describe('useOnboardingProgress', () => {
  it('shows the workspaces category', () => {
    const { visibleCategories } = renderProgress();

    expect(visibleCategories.map((category) => category.id)).toContain(
      'workspaces',
    );
  });

  it('counts completed workspace steps in the progress', () => {
    const { completedCount } = renderProgress([
      'createWorkspace',
      'favoriteWorkspace',
    ]);

    expect(completedCount).toBe(2);
  });
});
