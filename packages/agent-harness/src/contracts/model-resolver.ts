import type { ModelProvider, RunContext } from '@ayunis/agent-runtime';

export interface ModelResolutionContext {
  readonly context: RunContext;
  readonly signal?: AbortSignal;
}

export type ModelResolver<ModelSelector> = (
  selector: Readonly<ModelSelector>,
  context: ModelResolutionContext,
) => ModelProvider | Promise<ModelProvider>;
