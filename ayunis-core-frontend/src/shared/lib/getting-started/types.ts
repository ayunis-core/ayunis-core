export interface GettingStartedStep {
  id: string;
  translationKey: string;
  dependsOn?: string;
  action?:
    | { type: 'prompt' }
    | { type: 'link'; to: string; spotlight?: string }
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
