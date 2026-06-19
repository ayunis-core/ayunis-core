import type { ONBOARDING_CATEGORIES } from '../config/OnboardingCategories';
import type {
  OnboardingAction,
  OnboardingSecondaryAction,
} from '../config/OnboardingActions';

export type OnboardingStepId =
  (typeof ONBOARDING_CATEGORIES)[number]['steps'][number]['id'];

export interface OnboardingStep {
  id: OnboardingStepId;
  translationKey: string;
  dependsOn?: OnboardingStepId;
  action?: OnboardingAction;
  secondaryAction?: OnboardingSecondaryAction;
}

export interface OnboardingCategory {
  id: string;
  translationKey: string;
  steps: readonly OnboardingStep[];
  adminOnly?: boolean;
  helpPath?: string;
}
