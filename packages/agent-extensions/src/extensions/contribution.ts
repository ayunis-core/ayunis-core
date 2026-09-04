import type { Hook, Tool } from '@ayunis/agent-runtime';

export interface ExtensionContribution {
  readonly instructions?: string;
  readonly tools?: readonly Tool[];
  readonly hooks?: readonly Hook[];
}
