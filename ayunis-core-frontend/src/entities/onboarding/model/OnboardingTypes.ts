import type { TourTargetName } from '../config/OnboardingTourTargets';

export interface OnboardingStep {
  id: string;
  translationKey: string;
  dependsOn?: string;
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
  steps: OnboardingStep[];
  adminOnly?: boolean;
  helpPath?: string;
}
