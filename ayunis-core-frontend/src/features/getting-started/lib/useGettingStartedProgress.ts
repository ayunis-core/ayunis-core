import { useMemo } from 'react';
import { GETTING_STARTED_CATEGORIES } from './categories';
import { useCompletedSteps } from '../storage';
import type { GettingStartedCategory } from '../model/types';

export interface GettingStartedProgress {
  visibleCategories: GettingStartedCategory[];
  totalSteps: number;
  completedCount: number;
  overallProgress: number;
  progressPercent: number;
  firstIncompleteCategoryIndex: number;
  completedSteps: Set<string>;
}

/**
 * Progress hook for the Getting Started feature.
 *
 * `isAdmin` is passed in (rather than reading it via `useMe`) so this feature
 * doesn't depend on the widgets/ layer where `useMe` currently lives. The
 * caller (page or widget) already has access to the user role.
 */
export function useGettingStartedProgress(
  isAdmin: boolean,
): GettingStartedProgress {
  const completedSteps = useCompletedSteps();

  const visibleCategories = useMemo(
    () => GETTING_STARTED_CATEGORIES.filter((cat) => !cat.adminOnly || isAdmin),
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
