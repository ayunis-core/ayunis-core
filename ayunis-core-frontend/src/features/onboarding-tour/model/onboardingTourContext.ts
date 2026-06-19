import { createContext, useContext } from 'react';

export interface TourRequest {
  /** `data-tour` name set by <OnboardingTourTarget>; resolved to a `[data-tour="…"]` selector. */
  target: string;
  title?: string;
  description?: string;
  dismissLabel: string;
}

export interface OnboardingTourContextValue {
  launchTour: (request: TourRequest) => void;
  isTourActive: boolean;
}

export const OnboardingTourContext =
  createContext<OnboardingTourContextValue | null>(null);

/**
 * Access the onboarding spotlight tour. `launchTour` requests a spotlight from
 * anywhere in the authenticated tree; `isTourActive` lets bystanders (e.g. the
 * return button) yield while a tour runs. Must be used under
 * <OnboardingTourProvider>.
 */
export function useOnboardingTour(): OnboardingTourContextValue {
  const ctx = useContext(OnboardingTourContext);
  if (!ctx) {
    throw new Error(
      'useOnboardingTour must be used within an OnboardingTourProvider',
    );
  }
  return ctx;
}
