import type { TourTargetName } from '../config/OnboardingTourTargets';
import type { ONBOARDING_CATEGORIES } from '../config/OnboardingCategories';

/**
 * The onboarding catalog (`ONBOARDING_CATEGORIES`, declared `as const`) is the
 * single source of truth for which steps exist. `OnboardingStepId` is derived
 * from it, so adding or renaming a step in the catalog updates the type
 * automatically — there is no separate list to keep in sync.
 *
 * The step/category shapes stay as hand-written interfaces (rather than a raw
 * `typeof` derivation) so optional fields like `dependsOn`/`action` remain
 * uniformly accessible across every step instead of only on the catalog
 * members that happen to declare them.
 */
export type OnboardingStepId =
  (typeof ONBOARDING_CATEGORIES)[number]['steps'][number]['id'];

export interface OnboardingStep {
  id: OnboardingStepId;
  translationKey: string;
  dependsOn?: OnboardingStepId;
  action?:
    | { type: 'prompt'; attachment?: string }
    | { type: 'link'; to: string; spotlight?: TourTargetName }
    | { type: 'external'; url: string };
  secondaryAction?:
    | { type: 'external'; url: string }
    | { type: 'help-center'; path: string };
}

export interface OnboardingCategory {
  id: string;
  translationKey: string;
  steps: readonly OnboardingStep[];
  adminOnly?: boolean;
  helpPath?: string;
}
