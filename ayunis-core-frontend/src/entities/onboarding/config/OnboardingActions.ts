import type { TourTargetName } from './OnboardingTourTargets';

/**
 * Single source of truth for onboarding step action types. Referenced by the
 * catalog (`OnboardingCategories`), the step types (`OnboardingTypes`), and the
 * runtime branching in the step UI (`OnboardingStepItem`).
 */
export const ACTION_TYPE = {
  prompt: 'prompt',
  link: 'link',
  external: 'external',
} as const;

export type ActionType = (typeof ACTION_TYPE)[keyof typeof ACTION_TYPE];

export const SECONDARY_ACTION_TYPE = {
  external: 'external',
  helpCenter: 'help-center',
} as const;

export type SecondaryActionType =
  (typeof SECONDARY_ACTION_TYPE)[keyof typeof SECONDARY_ACTION_TYPE];

export type OnboardingAction =
  | { type: typeof ACTION_TYPE.prompt; attachment?: string }
  | { type: typeof ACTION_TYPE.link; to: string; spotlight?: TourTargetName }
  | { type: typeof ACTION_TYPE.external; url: string };

export type OnboardingSecondaryAction =
  | { type: typeof SECONDARY_ACTION_TYPE.external; url: string }
  | { type: typeof SECONDARY_ACTION_TYPE.helpCenter; path: string };
