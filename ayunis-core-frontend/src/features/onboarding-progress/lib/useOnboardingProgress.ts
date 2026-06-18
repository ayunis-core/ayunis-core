import { useMemo } from 'react';
import {
  ONBOARDING_CATEGORIES,
  type OnboardingCategory,
} from '@/entities/onboarding';
import { useCompletedSteps } from '../model/OnboardingStorage';

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
 * `isAdmin` is passed in (rather than reading it via `useMe`) so this feature
 * doesn't depend on the widgets/ layer where `useMe` currently lives. The
 * caller (page or widget) already has access to the user role.
 */
export function useOnboardingProgress(isAdmin: boolean): OnboardingProgress {
  const completedSteps = useCompletedSteps();

  const visibleCategories = useMemo(
    () => ONBOARDING_CATEGORIES.filter((cat) => !cat.adminOnly || isAdmin),
    [isAdmin],
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
