import type { SpotlightTargetName } from '@/shared/lib/spotlight-targets';

export interface GettingStartedStep {
  id: string;
  translationKey: string;
  dependsOn?: string;
  action?:
    | { type: 'prompt'; attachment?: string }
    | { type: 'link'; to: string; spotlight?: SpotlightTargetName }
    | { type: 'external'; url: string };
  secondaryAction?:
    | { type: 'external'; url: string }
    | { type: 'help-center'; path: string };
}

export interface GettingStartedCategory {
  id: string;
  translationKey: string;
  steps: GettingStartedStep[];
  adminOnly?: boolean;
  helpPath?: string;
}
