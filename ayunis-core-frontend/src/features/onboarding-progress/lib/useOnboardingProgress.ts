import { useMemo } from 'react';
import {
  ONBOARDING_CATEGORIES,
  type OnboardingCategory,
} from '@/entities/onboarding';

export interface OnboardingProgress {
  visibleCategories: OnboardingCategory[];
  totalSteps: number;
  completedCount: number;
  overallProgress: number;
  progressPercent: number;
  firstIncompleteCategoryIndex: number;
  completedSteps: Set<string>;
}

/**
 * Progress hook for the onboarding feature.
 *
 * Both `isAdmin` and `completedStepIds` are passed in (rather than reading them
 * via `useMe`) so this feature doesn't depend on the widgets/ layer where
 * `useMe` currently lives. The caller (page or widget) already fetches the
 * user via `useMe` and supplies the role and persisted completed step IDs.
 */
export function useOnboardingProgress(
  isAdmin: boolean,
  completedStepIds: string[],
): OnboardingProgress {
  const completedSteps = useMemo(
    () => new Set(completedStepIds),
    [completedStepIds],
  );

  const categories: readonly OnboardingCategory[] = ONBOARDING_CATEGORIES;

  const visibleCategories = useMemo(
    () => categories.filter((cat) => !cat.adminOnly || isAdmin),
    [categories, isAdmin],
  );

  const totalSteps = visibleCategories.reduce(
    (sum, cat) => sum + cat.steps.length,
    0,
  );

  const completedCount = visibleCategories.reduce(
    (sum, cat) =>
      sum + cat.steps.filter((s) => completedSteps.has(s.id)).length,
    0,
  );

  const overallProgress =
    totalSteps > 0 ? (completedCount / totalSteps) * 100 : 0;

  const progressPercent = Math.round(overallProgress);

  const firstIncompleteCategoryIndex = visibleCategories.findIndex((cat) =>
    cat.steps.some((s) => !completedSteps.has(s.id)),
  );

  return {
    visibleCategories,
    totalSteps,
    completedCount,
    overallProgress,
    progressPercent,
    firstIncompleteCategoryIndex,
    completedSteps,
  };
}
