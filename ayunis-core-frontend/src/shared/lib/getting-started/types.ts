export interface GettingStartedStep {
  id: string;
  translationKey: string;
  dependsOn?: string;
  action:
    | { type: 'prompt'; prompt: string }
    | { type: 'link'; to: string; spotlight?: string }
    | { type: 'external'; url: string };
}

export interface GettingStartedCategory {
  id: string;
  translationKey: string;
  steps: GettingStartedStep[];
  adminOnly?: boolean;
  helpUrl?: string;
}
